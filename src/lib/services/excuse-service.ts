import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ForbiddenError } from "@/lib/session";
import { scopeToRole, assertSchoolInScope } from "@/lib/scope";
import type { SessionUser } from "@/lib/auth";
import type { MarkExcusedInput } from "@/lib/validation/attendance";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Marks one intern-day Excused. This is the only correction path for
 * attendance (CLAUDE.md: "the intern cannot create, edit, or backdate an
 * attendance row by any means; the only correction path is a supervisor
 * excuse"). Requires a reason/reference (PRD §6.4).
 *
 * Keyed by (internId, shiftingId, date) rather than an AttendanceRecord id,
 * because a day with no punch at all (ABSENT) has no persisted row — the DTR
 * view materializes those virtually (see dtr-service.ts). Excusing such a
 * day must create the row, not update one that doesn't exist.
 */
export async function markExcused(actor: SessionUser, input: MarkExcusedInput) {
  const params = { internId: input.internId, shiftingId: input.shiftingId, date: input.date };
  if (actor.role !== "SUPERVISOR" && actor.role !== "ADMIN") {
    throw new ForbiddenError("Only a supervisor or admin can mark attendance as excused.");
  }

  const intern = await prisma.internProfile.findFirstOrThrow({
    where: { id: params.internId, ...scopeToRole.intern(actor) },
  });
  assertSchoolInScope(actor, intern.assignedSchoolId);

  return prisma.$transaction(async (tx) => {
    const before = await tx.attendanceRecord.findUnique({
      where: { internId_date: { internId: params.internId, date: params.date } },
    });

    const updated = await tx.attendanceRecord.upsert({
      where: { internId_date: { internId: params.internId, date: params.date } },
      update: {
        status: "EXCUSED",
        excuseReason: input.reason,
        excusedByUserId: actor.id,
        excusedAt: new Date(),
      },
      create: {
        internId: params.internId,
        shiftingId: params.shiftingId,
        date: params.date,
        status: "EXCUSED",
        excuseReason: input.reason,
        excusedByUserId: actor.id,
        excusedAt: new Date(),
      },
    });

    await writeAuditLog(
      {
        actor,
        action: "ATTENDANCE_MARK_EXCUSED",
        entityType: "AttendanceRecord",
        entityId: updated.id,
        diff: {
          before: before ? { status: before.status } : { status: "ABSENT (no prior record)" },
          after: { status: "EXCUSED", reason: input.reason },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return updated;
  });
}
