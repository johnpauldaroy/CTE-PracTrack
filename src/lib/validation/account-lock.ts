import { z } from "zod";

export const lockableRoles = ["STUDENT_INTERN", "COOPERATING_TEACHER", "SUPERVISOR"] as const;

/**
 * Who a lock / unlock applies to: either specific accounts, or everyone of the chosen roles
 * (optionally within one school). Admin accounts can never be targeted.
 */
export const accountLockSchema = z.object({
  action: z.enum(["preview", "lock", "unlock"]),
  userIds: z.array(z.string().min(1)).max(2000).optional(),
  roles: z.array(z.enum(lockableRoles)).min(1, "Pick at least one role").default([...lockableRoles]),
  schoolId: z.string().min(1).optional(),
  reason: z.string().trim().max(300).optional(),
});

export type AccountLockInput = z.infer<typeof accountLockSchema>;
