import { z } from "zod";

/** Query for per-intern, per-shifting reads (sessions, documents). */
export const internShiftingQuerySchema = z.object({ shiftingId: z.string().min(1, "shiftingId is required") });

export const assignSessionSchema = z.object({
  internId: z.string().min(1),
  date: z.coerce.date(),
  subject: z.string().trim().min(1).max(120),
  gradeSection: z.string().trim().min(1).max(120),
  topic: z.string().trim().min(1).max(200),
  type: z.enum(["REGULAR", "FINAL_DEMO"]),
  // The CT's instruction to the intern, e.g. "Submit your lesson plan within this date".
  notes: z.string().trim().max(1000).optional(),
  lessonPlanDueDate: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.date().optional()),
});

export const reviewLessonPlanSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("return"), note: z.string().trim().min(1, "Tell the intern what to fix").max(1000) }),
]);

export const submitEvaluationSchema = z.object({
  ratings: z.array(z.object({ itemId: z.string().min(1), rating: z.number().int().min(1).max(5) })).min(1),
  commendable: z.string().trim().max(2000).optional(),
  areasForImprovement: z.string().trim().max(2000).optional(),
});

export type ReviewLessonPlanInput = z.infer<typeof reviewLessonPlanSchema>;
export type AssignSessionInput = z.infer<typeof assignSessionSchema>;
export type SubmitEvaluationInput = z.infer<typeof submitEvaluationSchema>;
