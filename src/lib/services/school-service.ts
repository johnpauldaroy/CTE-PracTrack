import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ForbiddenError } from "@/lib/session";
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
      _count: { select: { interns: true } },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
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

/** Deleting a school with assigned interns is blocked (PRD §6.2); it must be emptied first. */
export async function deleteSchool(actor: SessionUser, schoolId: string) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const school = await tx.school.findFirstOrThrow({
      where: { id: schoolId, deletedAt: null },
      include: { _count: { select: { interns: true } } },
    });

    if (school._count.interns > 0) {
      throw new Error(
        `Cannot delete ${school.name}: ${school._count.interns} intern(s) are still assigned. Unassign or reassign them first.`,
      );
    }

    const deleted = await tx.school.update({ where: { id: schoolId }, data: { deletedAt: new Date() } });

    await writeAuditLog(
      { actor, action: "SCHOOL_DELETE", entityType: "School", entityId: schoolId },
      tx,
    );

    return deleted;
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
