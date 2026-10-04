import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ConflictError, ForbiddenError } from "@/lib/session";
import { assertSchoolInScope, scopeToRole } from "@/lib/scope";
import type { SessionUser } from "@/lib/auth";
import type { CreateSchoolInput, UpdateSchoolInput } from "@/lib/validation/school";
import type { Prisma } from "@/generated/prisma/client";

function requireAdmin(user: SessionUser) {
  if (user.role !== "ADMIN") throw new ForbiddenError("Only the CTE office can manage schools.");
}

export async function listSchools(user: SessionUser) {
  return prisma.school.findMany({
    where: { ...scopeToRole.school(user), deletedAt: null },
    include: {
      supervisorProfile: { include: { user: true } },
      // Deactivated (soft-deleted) intern accounts don't count as assigned.
      _count: { select: { interns: { where: { user: { deletedAt: null } } } } },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

/** Soft-deleted schools, newest first, for the "Recently deleted" list (admin only). */
export async function listDeletedSchools(actor: SessionUser) {
  requireAdmin(actor);
  return prisma.school.findMany({
    where: { deletedAt: { not: null } },
    select: { id: true, name: true, type: true, municipality: true, deletedAt: true },
    orderBy: { deletedAt: "desc" },
  });
}

export async function getSchoolDetail(user: SessionUser, schoolId: string) {
  assertSchoolInScope(user, schoolId);
  const school = await prisma.school.findFirstOrThrow({
    where: { id: schoolId, deletedAt: null },
    include: {
      supervisorProfile: { include: { user: true } },
    },
  });
  return school;
}

export async function createSchool(actor: SessionUser, input: CreateSchoolInput) {
  requireAdmin(actor);

  const school = await prisma.$transaction(async (tx) => {
    const created = await tx.school.create({
      data: {
        name: input.name,
        type: input.type,
        municipality: input.municipality,
        latitude: input.latitude,
        longitude: input.longitude,
        geofenceRadiusMeters: input.geofenceRadiusMeters,
      },
    });

    await writeAuditLog(
      {
        actor,
        action: "SCHOOL_CREATE",
        entityType: "School",
        entityId: created.id,
        diff: { after: input as unknown as Prisma.InputJsonValue },
      },
      tx,
    );

    return created;
  });

  return school;
}

export async function updateSchool(actor: SessionUser, schoolId: string, input: UpdateSchoolInput) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const before = await tx.school.findFirstOrThrow({ where: { id: schoolId, deletedAt: null } });
    const updated = await tx.school.update({ where: { id: schoolId }, data: input });

    await writeAuditLog(
      {
        actor,
        action: "SCHOOL_UPDATE",
        entityType: "School",
        entityId: schoolId,
        diff: { before: serializeSchool(before), after: serializeSchool(updated) } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return updated;
  });
}

export async function updateCheckInOverride(
  actor: SessionUser,
  schoolId: string,
  input: { timeInCutoff: string | null; timeOutStart: string | null },
) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const before = await tx.school.findFirstOrThrow({ where: { id: schoolId, deletedAt: null } });
    const updated = await tx.school.update({
      where: { id: schoolId },
      data: { timeInCutoff: input.timeInCutoff, timeOutStart: input.timeOutStart },
    });

    await writeAuditLog(
      {
        actor,
        action: "SCHOOL_CHECKIN_OVERRIDE_UPDATE",
        entityType: "School",
        entityId: schoolId,
        diff: {
          before: { timeInCutoff: before.timeInCutoff, timeOutStart: before.timeOutStart },
          after: { timeInCutoff: updated.timeInCutoff, timeOutStart: updated.timeOutStart },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return updated;
  });
}

/** Assigns (or reassigns) a school's supervisor. Reassignment is logged per PRD §6.2. */
export async function assignSupervisor(actor: SessionUser, schoolId: string, supervisorUserId: string) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const school = await tx.school.findFirstOrThrow({ where: { id: schoolId, deletedAt: null } });

    const supervisorUser = await tx.user.findFirstOrThrow({
      where: { id: supervisorUserId, role: "SUPERVISOR", status: "ACTIVE", deletedAt: null },
      include: { supervisorProfile: true },
    });
    if (!supervisorUser.supervisorProfile) {
      throw new Error("Selected user does not have a supervisor profile.");
    }

    const previousSupervisorProfile = await tx.supervisorProfile.findFirst({
      where: { schoolId },
      include: { user: true },
    });

    // A school has at most one assigned supervisor (PRD §6.2) — clear any
    // existing assignment on this school before setting the new one.
    if (previousSupervisorProfile && previousSupervisorProfile.id !== supervisorUser.supervisorProfile.id) {
      await tx.supervisorProfile.update({
        where: { id: previousSupervisorProfile.id },
        data: { schoolId: null },
      });
      await tx.schoolSupervisorHistory.updateMany({
        where: { schoolId, unassignedAt: null },
        data: { unassignedAt: new Date() },
      });
    }

    await tx.supervisorProfile.update({
      where: { id: supervisorUser.supervisorProfile.id },
      data: { schoolId },
    });

    await tx.schoolSupervisorHistory.create({
      data: { schoolId, supervisorUserId: supervisorUser.id, assignedByUserId: actor.id },
    });

    await writeAuditLog(
      {
        actor,
        action: "SCHOOL_SUPERVISOR_ASSIGN",
        entityType: "School",
        entityId: schoolId,
        diff: {
          before: previousSupervisorProfile?.user
            ? { supervisorUserId: previousSupervisorProfile.user.id, supervisorName: previousSupervisorProfile.user.name }
            : null,
          after: { supervisorUserId: supervisorUser.id, supervisorName: supervisorUser.name },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return school;
  });
}

/**
 * Soft-deletes a school: it disappears from every list and picker but its
 * rows (attendance, alerts, supervisor history) stay intact, and it can be
 * restored. Blocked while active interns or cooperating teachers still belong
 * to it (PRD §6.2) — they must be reassigned or removed first. Its supervisor
 * is unassigned in the same transaction so they don't point at a hidden school.
 */
export async function deleteSchool(actor: SessionUser, schoolId: string) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const school = await tx.school.findFirst({
      where: { id: schoolId, deletedAt: null },
      include: {
        supervisorProfile: { include: { user: { select: { id: true, name: true } } } },
        _count: {
          select: {
            interns: { where: { user: { deletedAt: null } } },
            cts: { where: { user: { deletedAt: null } } },
          },
        },
      },
    });
    if (!school) throw new ConflictError("This school no longer exists or was already deleted.");

    const blockers = [
      school._count.interns ? `${school._count.interns} intern(s)` : null,
      school._count.cts ? `${school._count.cts} cooperating teacher(s)` : null,
    ].filter(Boolean);
    if (blockers.length) {
      throw new ConflictError(
        `Cannot delete ${school.name}: ${blockers.join(" and ")} still belong to it. Reassign or remove them first.`,
      );
    }

    if (school.supervisorProfile) {
      await tx.supervisorProfile.update({ where: { id: school.supervisorProfile.id }, data: { schoolId: null } });
      await tx.schoolSupervisorHistory.updateMany({
        where: { schoolId, unassignedAt: null },
        data: { unassignedAt: new Date() },
      });
    }

    const deleted = await tx.school.update({ where: { id: schoolId }, data: { deletedAt: new Date() } });

    await writeAuditLog(
      {
        actor,
        action: "SCHOOL_DELETE",
        entityType: "School",
        entityId: schoolId,
        diff: {
          before: {
            ...serializeSchool(school),
            supervisorName: school.supervisorProfile?.user.name ?? null,
          },
          after: { deleted: true, supervisorUnassigned: !!school.supervisorProfile },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return deleted;
  });
}

/** Undoes a soft delete. The previous supervisor is not re-linked; assign one again if needed. */
export async function restoreSchool(actor: SessionUser, schoolId: string) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const school = await tx.school.findFirst({ where: { id: schoolId, deletedAt: { not: null } } });
    if (!school) throw new ConflictError("This school isn't in the deleted list.");

    const restored = await tx.school.update({ where: { id: schoolId }, data: { deletedAt: null } });

    await writeAuditLog(
      {
        actor,
        action: "SCHOOL_RESTORE",
        entityType: "School",
        entityId: schoolId,
        diff: { before: { deleted: true }, after: { deleted: false, name: restored.name } } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return restored;
  });
}

function serializeSchool(school: {
  name: string;
  type: string;
  municipality: string;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  geofenceRadiusMeters: number;
}) {
  return {
    name: school.name,
    type: school.type,
    municipality: school.municipality,
    latitude: school.latitude.toString(),
    longitude: school.longitude.toString(),
    geofenceRadiusMeters: school.geofenceRadiusMeters,
  };
}
