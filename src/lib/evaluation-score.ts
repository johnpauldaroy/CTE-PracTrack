import { prisma } from "@/lib/prisma";

export interface CriterionWithItems {
  id: string;
  weightPercent: number;
  itemIds: string[];
}

/**
 * Computes the weighted overall score from item ratings. The one scoring
 * implementation in the project (CLAUDE.md: "computed from the instrument,
 * never entered") — a session score is the weighted sum of each criterion's
 * mean-of-items, expressed as a percentage.
 *
 * `ratings` maps itemId -> rating (1-5). Every active item under every
 * active criterion must have a rating or this throws, so a partial
 * submission never silently scores as if missing items were zero.
 */
export function computeOverallScore(
  criteria: CriterionWithItems[],
  ratings: Map<string, number>,
): number {
  return computeCriterionScores(criteria, ratings).reduce((sum, c) => sum + c.weightedPercent, 0);
}

export interface CriterionScore {
  id: string;
  /** Mean of the criterion's item ratings, 1-5. */
  mean: number;
  /** This criterion's contribution to the overall percentage (0..weightPercent). */
  weightedPercent: number;
}

/** Per-criterion breakdown behind computeOverallScore — same rules, unrounded. */
export function computeCriterionScores(
  criteria: CriterionWithItems[],
  ratings: Map<string, number>,
): CriterionScore[] {
  const scores: CriterionScore[] = [];

  for (const criterion of criteria) {
    if (criterion.itemIds.length === 0) continue;

    let itemSum = 0;
    for (const itemId of criterion.itemIds) {
      const rating = ratings.get(itemId);
      if (rating === undefined) {
        throw new Error(`Missing rating for evaluation item ${itemId}`);
      }
      itemSum += rating;
    }

    const mean = itemSum / criterion.itemIds.length; // 1-5
    scores.push({ id: criterion.id, mean, weightedPercent: (mean / 5) * criterion.weightPercent });
  }

  return scores;
}

/** Loads the active evaluation instrument (criteria + their active items) from config. */
export async function loadActiveEvaluationInstrument(): Promise<CriterionWithItems[]> {
  const criteria = await prisma.evaluationCriterion.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: { items: { where: { isActive: true }, orderBy: { order: "asc" } } },
  });

  return criteria.map((c) => ({
    id: c.id,
    weightPercent: Number(c.weightPercent),
    itemIds: c.items.map((i) => i.id),
  }));
}
