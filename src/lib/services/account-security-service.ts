import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth";
import type { ChangePasswordInput } from "@/lib/validation/config";

/** Self-service change-password, available to every role from Profile/Settings. */
export async function changeOwnPassword(actor: SessionUser, input: ChangePasswordInput) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });

  const currentMatches = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!currentMatches) {
    throw new Error("Current password is incorrect.");
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: actor.id }, data: { passwordHash: newPasswordHash } });
    await writeAuditLog(
      { actor, action: "PASSWORD_CHANGE", entityType: "User", entityId: actor.id },
      tx,
    );
  });
}
