import { prisma } from "@/lib/prisma";

/**
 * Seed data for the evaluation instrument (PRD §6.6/§8). Weights must total
 * 100 — enforced by the sanity check at the bottom of this file, not just by
 * convention.
 *
 * Item wording for Lesson Planning and Teacher's Personality is transcribed
 * verbatim from the CTE's mockup deck (UI_FLOW_SPEC.md §5.3) and is real.
 *
 * Item wording for Content, Teaching Methods, Classroom Management, and
 * Questioning Skills is NOT available anywhere in the PRD or the mockup deck
 * — PRD §10 Q2 is explicitly open on this. Each of those four criteria is
 * seeded with ONE placeholder item so the instrument is structurally
 * complete and the weighted-scoring math works end-to-end, but this is a
 * stand-in, not the real instrument. Replace `items` for these four
 * criteria the moment the CTE supplies the actual rating sheet — do not
 * treat the placeholder wording as final.
 */
const CRITERIA: Array<{
  order: number;
  name: string;
  weightPercent: number;
  items: string[];
  isPlaceholder?: boolean;
}> = [
  {
    order: 1,
    name: "Lesson Planning",
    weightPercent: 15,
    items: [
      "Specific learning outcomes are stated in behavioral terms",
      "There is congruence between specific learning outcomes and subject matter",
      "Teaching procedure is appropriate and well-structured",
      "Formative test is included and aligned with objectives",
      "Assignment is meaningful and appropriate",
      "Specific learning outcomes are achieved",
      "There is proper sequencing of the lesson",
    ],
  },
  {
    order: 2,
    name: "Content",
    weightPercent: 20,
    items: ["PLACEHOLDER — awaiting the CTE's official rating sheet (PRD §10 Q2)"],
    isPlaceholder: true,
  },
  {
    order: 3,
    name: "Teaching Methods",
    weightPercent: 20,
    items: ["PLACEHOLDER — awaiting the CTE's official rating sheet (PRD §10 Q2)"],
    isPlaceholder: true,
  },
  {
    order: 4,
    name: "Classroom Management",
    weightPercent: 15,
    items: ["PLACEHOLDER — awaiting the CTE's official rating sheet (PRD §10 Q2)"],
    isPlaceholder: true,
  },
  {
    order: 5,
    name: "Questioning Skills",
    weightPercent: 15,
    items: ["PLACEHOLDER — awaiting the CTE's official rating sheet (PRD §10 Q2)"],
    isPlaceholder: true,
  },
  {
    order: 6,
    name: "Teacher's Personality",
    weightPercent: 15,
    items: [
      "Is neat and well-groomed",
      "Is free from mannerisms that tend to disturb students' attention",
      "Shows dynamism and enthusiasm in teaching",
      "Has a pleasant disposition toward students",
      "Has a well-modulated voice",
      "The teacher's personality commands respect and attention",
    ],
  },
];

export async function seedEvaluationInstrument() {
  const totalWeight = CRITERIA.reduce((sum, c) => sum + c.weightPercent, 0);
  if (totalWeight !== 100) {
    throw new Error(`Evaluation criteria weights must total 100, got ${totalWeight}`);
  }

  for (const criterion of CRITERIA) {
    const created = await prisma.evaluationCriterion.upsert({
      where: { order: criterion.order },
      update: { name: criterion.name, weightPercent: criterion.weightPercent, isActive: true },
      create: {
        order: criterion.order,
        name: criterion.name,
        weightPercent: criterion.weightPercent,
        isActive: true,
      },
    });

    for (const [index, text] of criterion.items.entries()) {
      await prisma.evaluationItem.upsert({
        where: { criterionId_order: { criterionId: created.id, order: index + 1 } },
        update: { text, isActive: true },
        create: { criterionId: created.id, order: index + 1, text, isActive: true },
      });
    }

    if (criterion.isPlaceholder) {
      console.warn(
        `[seed] "${criterion.name}" seeded with a PLACEHOLDER item — replace once the CTE supplies the real rating sheet (PRD §10 Q2).`,
      );
    }
  }

  console.log(`[seed] Evaluation instrument: ${CRITERIA.length} criteria, weights sum to 100.`);
}
