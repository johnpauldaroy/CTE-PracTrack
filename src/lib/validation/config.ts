import { z } from "zod";

export const flaggingRuleConfigSchema = z.object({
  absenceEarlyWarning: z.number().int().min(1).max(60),
  consecutiveAbsences: z.number().int().min(1).max(60),
  dropEligibleAbove: z.number().int().min(1).max(180),
  evaluationPendingDays: z.number().int().min(1).max(60),
  behindPaceTolerance: z.number().min(0).max(100),
});

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm format");

export const checkInConfigSchema = z
  .object({
    amTimeInCutoff: hhmm,
    amTimeOutStart: hhmm,
    pmTimeInCutoff: hhmm,
    pmTimeOutStart: hhmm,
    pmWindowOpensAt: hhmm,
  })
  .superRefine((data, ctx) => {
    // "HH:mm" strings compare correctly as text.
    if (data.amTimeOutStart <= data.amTimeInCutoff) {
      ctx.addIssue({ code: "custom", path: ["amTimeOutStart"], message: "Must be after the morning Time In cut-off" });
    }
    if (data.pmTimeOutStart <= data.pmTimeInCutoff) {
      ctx.addIssue({ code: "custom", path: ["pmTimeOutStart"], message: "Must be after the afternoon Time In cut-off" });
    }
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type FlaggingRuleConfigInput = z.infer<typeof flaggingRuleConfigSchema>;
export type CheckInConfigInput = z.infer<typeof checkInConfigSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
