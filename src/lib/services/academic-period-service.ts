import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ForbiddenError } from "@/lib/session";
import type { SessionUser } from "@/lib/auth";
import type { CreateSemesterInput, ConfigureShiftingInput } from "@/lib/validation/shifting";
import type { Prisma } from "@/generated/prisma/client";

function requireAdmin(user: SessionUser) {
  if (user.role !== "ADMIN") throw new ForbiddenError("Only the CTE office can manage semesters.");
}

/** Non-archived academic years with their semesters and shiftings, for the main Semesters view. */
export async function listActiveAcademicYears() {
  return prisma.academicYear.findMany({
    where: { isArchived: false },
    include: {
      semesters: {
        include: { shiftings: { orderBy: { name: "asc" } } },
        orderBy: { startDate: "desc" },
      },
    },
    orderBy: { label: "desc" },
  });
}

/** Archived academic years, read-only (PRD §5). */
export async function listArchivedAcademicYears() {
  return prisma.academicYear.findMany({
    where: { isArchived: true },
    include: {
      semesters: { include: { shiftings: { orderBy: { name: "asc" } } }, orderBy: { startDate: "desc" } },
    },
    orderBy: { label: "desc" },
  });
}

/** Creates a semester with two fixed shiftings (First/Second), both Upcoming, under the given academic year (created if new). */
export async function createSemester(actor: SessionUser, input: CreateSemesterInput) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const academicYear = await tx.academicYear.upsert({
      where: { label: input.academicYearLabel },
      update: {},
      create: { label: input.academicYearLabel },
    });

    const semester = await tx.semester.create({
      data: {
        academicYearId: academicYear.id,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });

    const [firstShifting, secondShifting] = await Promise.all([
      tx.shifting.create({
        data: { semesterId: semester.id, name: "FIRST", startDate: input.startDate, endDate: input.endDate, status: "UPCOMING" },
      }),
      tx.shifting.create({
        data: { semesterId: semester.id, name: "SECOND", startDate: input.startDate, endDate: input.endDate, status: "UPCOMING" },
      }),
    ]);

    await writeAuditLog(
      {
        actor,
        action: "SEMESTER_CREATE",
        entityType: "Semester",
        entityId: semester.id,
        diff: { after: input as unknown as Prisma.InputJsonValue },
      },
      tx,
    );

    return { semester, shiftings: [firstShifting, secondShifting] };
  });
}

/** Edits a shifting's dates and requirements (does not change status — see activateShifting). */
export async function configureShifting(actor: SessionUser, shiftingId: string, input: ConfigureShiftingInput) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const before = await tx.shifting.findUniqueOrThrow({ where: { id: shiftingId } });
    const updated = await tx.shifting.update({
      where: { id: shiftingId },
      data: {
        startDate: input.startDate,
        endDate: input.endDate,
        requiredTeachingSessions: input.requiredTeachingSessions,
        requiredFinalDemos: input.requiredFinalDemos,
      },
    });

    await writeAuditLog(
      {
        actor,
        action: "SHIFTING_CONFIGURE",
        entityType: "Shifting",
        entityId: shiftingId,
        diff: {
          before: {
            startDate: before.startDate,
            endDate: before.endDate,
            requiredTeachingSessions: before.requiredTeachingSessions,
            requiredFinalDemos: before.requiredFinalDemos,
          },
          after: input,
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return updated;
  });
}

/**
 * Activates a shifting: the previously active shifting (system-wide, at
 * most one at a time) becomes Completed; the target becomes Active.
 *
 * Per CLAUDE.md/PRD §5: this never mutates or deletes a single historical
 * row. "Resetting counters" is not a write at all — every dashboard/report
 * query is already scoped by shiftingId, so a newly Active shifting has no
 * attendance/session/document/alert rows yet and therefore reads as zero
 * automatically. There is nothing to reset in the database.
 */
export async function activateShifting(actor: SessionUser, shiftingId: string) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const target = await tx.shifting.findUniqueOrThrow({ where: { id: shiftingId } });
    if (target.status === "ACTIVE") {
      return target;
    }

    const currentlyActive = await tx.shifting.findFirst({ where: { status: "ACTIVE" } });
    if (currentlyActive) {
      await tx.shifting.update({
        where: { id: currentlyActive.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    const activated = await tx.shifting.update({
      where: { id: shiftingId },
      data: { status: "ACTIVE", activatedAt: new Date() },
    });

    await writeAuditLog(
      {
        actor,
        action: "SHIFTING_ACTIVATE",
        entityType: "Shifting",
        entityId: shiftingId,
        diff: {
          before: currentlyActive ? { previousActiveShiftingId: currentlyActive.id } : null,
          after: { activeShiftingId: shiftingId },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return activated;
  });
}
