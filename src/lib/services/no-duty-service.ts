import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ForbiddenError, FieldValidationError } from "@/lib/session";
import { assertSchoolInScope, scopeToRole } from "@/lib/scope";
import { evaluateAlertsForShifting } from "@/lib/services/alert-service";
import type { SessionUser } from "@/lib/auth";
import type { MarkNoDutyInput } from "@/lib/validation/no-duty";
import type { Prisma } from "@/generated/prisma/client";

const MAX_RANGE_DAYS = 62;

/** UTC-midnight Date for the calendar day the input names (the @db.Date convention). */
function toDateOnly(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function requireStaff(actor: SessionUser) {
  if (actor.role !== "ADMIN" && actor.role !== "SUPERVISOR") {
    throw new ForbiddenError("Only a supervisor or the CTE office can mark no-class / no-duty days.");
  }
}

/**
 * Marks one date (or an inclusive range) as "No class or duty" for one intern, a
 * whole school, or every school (admin only). Days with no punch on these dates are
 * never absences, and the intern's Time In / Time Out are blocked (attendance-service).
 * A day the intern already punched keeps its real status. Scope comes from the
 * session: a supervisor can only act inside their own schools.
 */
export async function markNoDuty(actor: SessionUser, input: MarkNoDutyInput) {
  requireStaff(actor);

  const start = toDateOnly(input.startDate);
  const end = toDateOnly(input.endDate ?? input.startDate);
  const dayCount = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (dayCount > MAX_RANGE_DAYS) {
    throw new FieldValidationError({ endDate: [`A range can cover at most ${MAX_RANGE_DAYS} days.`] });
  }

  let schoolId: string | null = null;
  let internId: string | null = null;
  let internSchoolId: string | null = null;
  if (input.scope === "ALL") {
    if (actor.role !== "ADMIN") throw new ForbiddenError("Only the CTE office can mark a day for every school.");
  } else if (input.scope === "SCHOOL") {
    assertSchoolInScope(actor, input.schoolId!);
    const school = await prisma.school.findFirst({ where: { id: input.schoolId!, deletedAt: null } });
    if (!school) throw new FieldValidationError({ schoolId: ["Select an active school"] });
    schoolId = school.id;
  } else {
    const intern = await prisma.internProfile.findFirst({ where: { id: input.internId!, ...scopeToRole.intern(actor) } });
    if (!intern) throw new ForbiddenError("The intern is outside your scope.");
    internId = intern.id;
    internSchoolId = intern.assignedSchoolId;
  }

  // The whole range must sit inside one shifting (prefer the active one).
  const candidates = await prisma.shifting.findMany({
    where: { startDate: { lte: start }, endDate: { gte: start } },
    orderBy: { startDate: "desc" },
  });
  const shifting = candidates.find((s) => s.status === "ACTIVE") ?? candidates[0];
  if (!shifting) throw new FieldValidationError({ startDate: ["This date is not inside any shifting."] });
  if (end > shifting.endDate) {
    throw new FieldValidationError({ endDate: ["The range runs past the end of the shifting."] });
  }

  const dates: Date[] = [];
  for (let i = 0; i < dayCount; i++) dates.push(new Date(start.getTime() + i * 86_400_000));

  const created = await prisma.$transaction(async (tx) => {
    const existing = await tx.nonDutyDay.findMany({
      where: { shiftingId: shifting.id, schoolId, internId, date: { in: dates } },
      select: { date: true },
    });
    const have = new Set(existing.map((row) => row.date.getTime()));
    const fresh = dates.filter((date) => !have.has(date.getTime()));
    if (!fresh.length) return [];

    await tx.nonDutyDay.createMany({
      data: fresh.map((date) => ({
        shiftingId: shifting.id,
        date,
        schoolId,
        internId,
        reason: input.reason,
        createdByUserId: actor.id,
      })),
    });
    const rows = await tx.nonDutyDay.findMany({
      where: { shiftingId: shifting.id, schoolId, internId, date: { in: fresh } },
      select: { id: true },
    });

    await writeAuditLog(
      {
        actor,
        action: "NO_DUTY_MARK",
        entityType: "NonDutyDay",
        entityId: rows[0]?.id ?? shifting.id,
        diff: {
          after: {
            scope: input.scope === "ALL" ? "ALL_SCHOOLS" : input.scope,
            schoolId: schoolId ?? internSchoolId,
            internId,
            shiftingId: shifting.id,
            startDate: fresh[0].toISOString(),
            endDate: fresh[fresh.length - 1].toISOString(),
            days: fresh.length,
            reason: input.reason,
          },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );
    return fresh;
  });

  if (created.length && shifting.status === "ACTIVE") {
    // Absence alerts that rested on these days are re-evaluated right away. Never throws into the request.
    try {
      await evaluateAlertsForShifting({
        where: internId ? { id: internId } : schoolId ? { assignedSchoolId: schoolId } : {},
      });
    } catch (error) {
      console.error("[alerts] re-evaluation after no-duty marking failed", error);
    }
  }

  return { created: created.length, skipped: dayCount - created.length };
}

/** No-duty entries within the caller's scope for one shifting (optionally narrowed to what affects one intern). */
export async function listNoDutyDays(actor: SessionUser, opts: { shiftingId: string; internId?: string }) {
  requireStaff(actor);
  let affecting: Prisma.NonDutyDayWhereInput = {};
  if (opts.internId) {
    const intern = await prisma.internProfile.findFirst({ where: { id: opts.internId, ...scopeToRole.intern(actor) } });
    if (!intern) throw new ForbiddenError("The intern is outside your scope.");
    affecting = {
      OR: [{ internId: intern.id }, { internId: null, schoolId: intern.assignedSchoolId }, { internId: null, schoolId: null }],
    };
  }
  const rows = await prisma.nonDutyDay.findMany({
    where: { AND: [scopeToRole.nonDutyDay(actor), affecting], shiftingId: opts.shiftingId },
    include: {
      school: { select: { name: true } },
      intern: { select: { user: { select: { name: true } } } },
    },
    orderBy: { date: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    reason: row.reason,
    scope: row.internId ? ("INTERN" as const) : row.schoolId ? ("SCHOOL" as const) : ("ALL" as const),
    label: row.intern?.user.name ?? row.school?.name ?? "All schools",
    // A supervisor can lift school and intern entries inside their scope, but not an all-schools one.
    canRemove: actor.role === "ADMIN" || !!(row.internId || row.schoolId),
  }));
}

export async function unmarkNoDuty(actor: SessionUser, id: string) {
  requireStaff(actor);
  const row = await prisma.nonDutyDay.findFirst({ where: { id, ...scopeToRole.nonDutyDay(actor) } });
  if (!row) throw new ForbiddenError("This entry is outside your scope.");
  if (!row.internId && !row.schoolId && actor.role !== "ADMIN") {
    throw new ForbiddenError("Only the CTE office can lift an all-schools no-duty day.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.nonDutyDay.delete({ where: { id } });
    await writeAuditLog(
      {
        actor,
        action: "NO_DUTY_UNMARK",
        entityType: "NonDutyDay",
        entityId: id,
        diff: {
          before: {
            date: row.date.toISOString(),
            schoolId: row.schoolId,
            internId: row.internId,
            shiftingId: row.shiftingId,
            reason: row.reason,
          },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );
  });

  try {
    await evaluateAlertsForShifting({
      where: row.internId ? { id: row.internId } : row.schoolId ? { assignedSchoolId: row.schoolId } : {},
    });
  } catch (error) {
    console.error("[alerts] re-evaluation after no-duty removal failed", error);
  }
}
