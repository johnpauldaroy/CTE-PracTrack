import { z } from "zod";

export const flaggingRuleConfigSchema = z.object({
  absenceEarlyWarning: z.number().int().min(1).max(60),
  consecutiveAbsences: z.number().int().min(1).max(60),
  dropEligibleAbove: z.number().int().min(1).max(180),
  evaluationPendingDays: z.number().int().min(1).max(60),
  behindPaceTolerance: z.number().min(0).max(100),
});

export const checkInConfigSchema = z.object({
  timeInCutoff: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm format"),
  timeOutStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm format"),
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
