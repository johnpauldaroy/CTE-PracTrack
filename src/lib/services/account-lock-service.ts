import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { FieldValidationError, ForbiddenError } from "@/lib/session";
import type { SessionUser } from "@/lib/auth";
import type { AccountLockInput } from "@/lib/validation/account-lock";
import type { Prisma, Role, UserStatus } from "@/generated/prisma/client";

/**
 * Admin lock / unlock of other users' accounts, e.g. once a semester has ended.
 * A lock is reversible and distinct from deleting an account: it only blocks sign-in
 * (and ends open sessions on the next request, see requireSession) and changes no record.
 * Admin accounts, pending registrations and deleted accounts are never touched.
 */
function requireAdmin(actor: SessionUser) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only the CTE office can lock or unlock accounts.");
}

function targetWhere(input: AccountLockInput, status: UserStatus): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = { status, deletedAt: null, role: { in: input.roles as Role[] } };
  if (input.userIds?.length) where.id = { in: input.userIds };
  if (input.schoolId) {
    where.OR = [
      { internProfile: { assignedSchoolId: input.schoolId } },
      { ctProfile: { schoolId: input.schoolId } },
      { supervisorProfile: { schools: { some: { schoolId: input.schoolId } } } },
    ];
  }
  return where;
}

/** How many accounts a lock (status ACTIVE) or unlock (status LOCKED) would touch, by role. */
export async function previewAccountLock(actor: SessionUser, input: AccountLockInput, mode: "lock" | "unlock") {
  requireAdmin(actor);
  const grouped = await prisma.user.groupBy({
    by: ["role"],
    where: targetWhere(input, mode === "lock" ? "ACTIVE" : "LOCKED"),
    _count: { _all: true },
  });
  const counts = Object.fromEntries(grouped.map((row) => [row.role, row._count._all])) as Partial<Record<Role, number>>;
  return { counts, total: grouped.reduce((n, row) => n + row._count._all, 0) };
}

async function change(actor: SessionUser, input: AccountLockInput, mode: "lock" | "unlock") {
  requireAdmin(actor);
  if (mode === "lock" && !input.reason?.trim()) {
    throw new FieldValidationError({ reason: ["Give a reason, e.g. “Semester ended”."] });
  }

  return prisma.$transaction(async (tx) => {
    const targets = await tx.user.findMany({
      where: { ...targetWhere(input, mode === "lock" ? "ACTIVE" : "LOCKED"), NOT: { id: actor.id } },
      select: { id: true, role: true },
    });
    if (!targets.length) return { changed: 0 };

    const ids = targets.map((user) => user.id);
    await tx.user.updateMany({
      where: { id: { in: ids } },
      data:
        mode === "lock"
          ? { status: "LOCKED", lockedAt: new Date(), lockedByUserId: actor.id, lockReason: input.reason!.trim() }
          : { status: "ACTIVE", lockedAt: null, lockedByUserId: null, lockReason: null },
    });

    // One audit row per account keeps each account's history complete; one summary row ties the run together.
    const action = mode === "lock" ? "ACCOUNT_LOCK" : "ACCOUNT_UNLOCK";
    await tx.auditLog.createMany({
      data: targets.map((user) => ({
        actorUserId: actor.id,
        actorRole: actor.role,
        action,
        entityType: "User",
        entityId: user.id,
        diff: {
          before: { status: mode === "lock" ? "ACTIVE" : "LOCKED" },
          after: { status: mode === "lock" ? "LOCKED" : "ACTIVE", ...(input.reason ? { reason: input.reason.trim() } : {}) },
        } as Prisma.InputJsonValue,
      })),
    });
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: `${action}_BULK`,
        entityType: "AccountLockRun",
        entityId: randomUUID(),
        diff: {
          after: {
            accounts: targets.length,
            roles: [...new Set(targets.map((user) => user.role))].join(", "),
            ...(input.schoolId ? { schoolId: input.schoolId } : {}),
            ...(input.reason ? { reason: input.reason.trim() } : {}),
          },
        } as Prisma.InputJsonValue,
      },
    });
    return { changed: targets.length };
  });
}

export const lockAccounts = (actor: SessionUser, input: AccountLockInput) => change(actor, input, "lock");
export const unlockAccounts = (actor: SessionUser, input: AccountLockInput) => change(actor, input, "unlock");
