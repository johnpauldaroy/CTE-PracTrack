import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ConflictError, ForbiddenError } from "@/lib/session";
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

/**
 * Moves an academic year into the read-only "Archived Academic Years" list.
 * Only allowed once every shifting in it is COMPLETED — an archived year must
 * never contain the active (or a still-upcoming) shifting. Archiving changes no
 * historical rows; it's a display flag.
 */
export async function archiveAcademicYear(actor: SessionUser, academicYearId: string) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const year = await tx.academicYear.findUnique({
      where: { id: academicYearId },
      include: { semesters: { include: { shiftings: { select: { status: true } } } } },
    });
    if (!year) throw new ConflictError("Academic year not found.");
    if (year.isArchived) throw new ConflictError(`Academic Year ${year.label} is already archived.`);
    const shiftings = year.semesters.flatMap((semester) => semester.shiftings);
    if (!shiftings.length || shiftings.some((shifting) => shifting.status !== "COMPLETED")) {
      throw new ConflictError(`Academic Year ${year.label} can be archived only after all of its shiftings are completed.`);
    }

    const archived = await tx.academicYear.update({ where: { id: academicYearId }, data: { isArchived: true } });

    await writeAuditLog(
      {
        actor,
        action: "ACADEMIC_YEAR_ARCHIVE",
        entityType: "AcademicYear",
        entityId: academicYearId,
        diff: { before: { isArchived: false }, after: { isArchived: true } } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return archived;
  });
}
