import { z } from "zod";

// One request marks a single date or an inclusive range (endDate defaults to startDate).
export const markNoDutySchema = z
  .object({
    scope: z.enum(["INTERN", "SCHOOL", "ALL"]),
    internId: z.string().min(1).optional(),
    schoolId: z.string().min(1).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    reason: z.string().trim().min(1, "A reason is required").max(200),
  })
  .superRefine((data, ctx) => {
    if (data.scope === "INTERN" && !data.internId) {
      ctx.addIssue({ code: "custom", path: ["internId"], message: "Select an intern" });
    }
    if (data.scope === "SCHOOL" && !data.schoolId) {
      ctx.addIssue({ code: "custom", path: ["schoolId"], message: "Select a school" });
    }
    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must not be before the start date" });
    }
  });

export type MarkNoDutyInput = z.infer<typeof markNoDutySchema>;
