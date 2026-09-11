import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ForbiddenError } from "@/lib/session";
import type { SessionUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

function requireAdmin(user: SessionUser) {
  if (user.role !== "ADMIN") throw new ForbiddenError("Only the CTE office can manage CT accounts.");
}

export async function listPendingCts(user: SessionUser) {
  requireAdmin(user);
  return prisma.cooperatingTeacherProfile.findMany({
    where: { user: { status: "PENDING", deletedAt: null } },
    include: { user: true, school: true },
    orderBy: { user: { createdAt: "asc" } },
  });
}

export async function listActiveCts(user: SessionUser) {
  requireAdmin(user);
  return prisma.cooperatingTeacherProfile.findMany({
    where: { user: { status: "ACTIVE", deletedAt: null } },
    include: {
      user: true,
      school: true,
      assignedInterns: { include: { user: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

/** CT detail with each assigned intern's session progress and absence count (PRD §6.3). */
export async function getCtDetail(user: SessionUser, ctProfileId: string) {
  requireAdmin(user);

  const [ctProfile, activeShifting] = await Promise.all([
    prisma.cooperatingTeacherProfile.findFirstOrThrow({
      where: { id: ctProfileId },
      include: {
        user: true,
        school: true,
        assignedInterns: { include: { user: true } },
      },
    }),
    prisma.shifting.findFirst({ where: { status: "ACTIVE" } }),
  ]);

  const internsWithProgress = await Promise.all(
    ctProfile.assignedInterns.map(async (intern) => {
      if (!activeShifting) {
        return { id: intern.id, name: intern.user.name, course: intern.course, sessionsLogged: 0, absences: 0 };
      }
      const [sessionsLogged, absences] = await Promise.all([
        prisma.teachingSession.count({
          where: { internId: intern.id, shiftingId: activeShifting.id, type: "REGULAR" },
        }),
        prisma.attendanceRecord.count({
          where: { internId: intern.id, shiftingId: activeShifting.id, status: "ABSENT" },
        }),
      ]);
      return { id: intern.id, name: intern.user.name, course: intern.course, sessionsLogged, absences };
    }),
  );

  return {
    id: ctProfile.id,
    name: ctProfile.user.name,
    email: ctProfile.user.email,
    phone: ctProfile.user.phone,
    school: ctProfile.school,
    requiredTeachingSessions: activeShifting?.requiredTeachingSessions ?? null,
    assignedInterns: internsWithProgress,
  };
}

export async function approveCt(actor: SessionUser, ctProfileId: string) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const profile = await tx.cooperatingTeacherProfile.findFirstOrThrow({
      where: { id: ctProfileId },
      include: { user: true },
    });
    if (profile.user.status !== "PENDING") {
      throw new Error("This account is not pending approval.");
    }

    const user = await tx.user.update({
      where: { id: profile.userId },
      data: { status: "ACTIVE" },
    });
    await tx.cooperatingTeacherProfile.update({
      where: { id: ctProfileId },
      data: { approvedByUserId: actor.id, approvedAt: new Date() },
    });

    await writeAuditLog(
      {
        actor,
        action: "CT_APPROVE",
        entityType: "CooperatingTeacherProfile",
        entityId: ctProfileId,
        diff: { after: { status: "ACTIVE" } } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return user;
  });
}

/** Deletes a pending (never-approved) CT registration, or deactivates an active one. */
export async function deleteCt(actor: SessionUser, ctProfileId: string) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const profile = await tx.cooperatingTeacherProfile.findFirstOrThrow({
      where: { id: ctProfileId },
      include: { user: true },
    });

    const deactivated = await tx.user.update({
      where: { id: profile.userId },
      data: { status: "INACTIVE", deletedAt: new Date() },
    });

    await writeAuditLog(
      {
        actor,
        action: profile.user.status === "PENDING" ? "CT_REGISTRATION_REJECT" : "CT_DELETE",
        entityType: "CooperatingTeacherProfile",
        entityId: ctProfileId,
      },
      tx,
    );

    return deactivated;
  });
}
