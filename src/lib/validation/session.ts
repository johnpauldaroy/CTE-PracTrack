import { z } from "zod";

export const assignSessionSchema = z.object({
  internId: z.string().min(1),
  date: z.coerce.date(),
  subject: z.string().trim().min(1).max(120),
  gradeSection: z.string().trim().min(1).max(120),
  topic: z.string().trim().min(1).max(200),
  type: z.enum(["REGULAR", "FINAL_DEMO"]),
});

export const submitEvaluationSchema = z.object({
  ratings: z.array(z.object({ itemId: z.string().min(1), rating: z.number().int().min(1).max(5) })).min(1),
  commendable: z.string().trim().max(2000).optional(),
  areasForImprovement: z.string().trim().max(2000).optional(),
});

export type AssignSessionInput = z.infer<typeof assignSessionSchema>;
export type SubmitEvaluationInput = z.infer<typeof submitEvaluationSchema>;
