import type { Prisma } from "@/generated/prisma/client";

/** The address a deleted account's email is rewritten to. It can never receive mail or sign in. */
export function tombstoneEmail(userId: string) {
  return `deleted+${userId}@invalid.local`;
}

/**
 * The one place that soft-deletes a user. The row stays (audit logs, attendance and evaluations point at it),
 * but its email is moved to `deletedEmail` and replaced by a tombstone so the address can be registered again.
 */
export async function softDeleteUser(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, deletedAt: true } });
  return tx.user.update({
    where: { id: userId },
    data: {
      status: "INACTIVE",
      deletedAt: user.deletedAt ?? new Date(),
      ...(user.deletedAt ? {} : { deletedEmail: user.email, email: tombstoneEmail(userId) }),
    },
  });
}
