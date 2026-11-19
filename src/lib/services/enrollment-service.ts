import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ForbiddenError } from "@/lib/session";
import { scopeToRole } from "@/lib/scope";
import type { SessionUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

function requireStaff(actor: SessionUser) {
  if (actor.role !== "ADMIN" && actor.role !== "SUPERVISOR") {
    throw new ForbiddenError("Only a supervisor or the CTE office can confirm an enrollment.");
  }
}

/** Interns who verified their email and are waiting for confirmation, within the caller's schools. */
export async function listPendingEnrollments(actor: SessionUser) {
  requireStaff(actor);
  return prisma.internProfile.findMany({
    where: {
      ...scopeToRole.intern(actor),
      enrollmentStatus: "PENDING",
      user: { deletedAt: null, emailVerifiedAt: { not: null } },
    },
    include: {
      user: { select: { name: true, email: true, phone: true, createdAt: true } },
      assignedSchool: { select: { id: true, name: true } },
      section: { select: { name: true } },
    },
    orderBy: { user: { createdAt: "asc" } },
  });
}

async function loadPending(actor: SessionUser, internId: string) {
  requireStaff(actor);
  // Scope comes from the session: a supervisor only reaches interns at their own schools.
  const intern = await prisma.internProfile.findFirst({
    where: {
      id: internId,
      ...scopeToRole.intern(actor),
      enrollmentStatus: "PENDING",
      user: { deletedAt: null, emailVerifiedAt: { not: null } },
    },
    include: { user: true, assignedSchool: { select: { name: true } } },
  });
  if (!intern) throw new ForbiddenError("This enrollment request is outside your scope or no longer pending.");
  return intern;
}

/** Confirms the intern at their school: the account becomes usable. */
export async function approveEnrollment(actor: SessionUser, internId: string) {
  const intern = await loadPending(actor, internId);
  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: intern.userId }, data: { status: "ACTIVE" } });
    const updated = await tx.internProfile.update({
      where: { id: internId },
      data: { enrollmentStatus: "ENROLLED", enrolledAt: new Date(), enrolledByUserId: actor.id, rejectionReason: null },
    });
    await tx.notification.create({
      data: {
        userId: intern.userId,
        type: "INTERN_ENROLLMENT_APPROVED",
        title: "Enrollment confirmed",
        body: `You are enrolled at ${intern.assignedSchool.name}. You can sign in now.`,
        href: "/m/intern",
      },
    });
    await writeAuditLog(
      {
        actor,
        action: "INTERN_ENROLLMENT_APPROVE",
        entityType: "InternProfile",
        entityId: internId,
        diff: { before: { status: "PENDING" }, after: { status: "ENROLLED", schoolId: intern.assignedSchoolId } } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );
    return updated;
  });
}

/** Declines the request; the intern is told why the next time they try to sign in. */
export async function rejectEnrollment(actor: SessionUser, internId: string, reason: string) {
  await loadPending(actor, internId); // scope + pending check
  return prisma.$transaction(async (tx) => {
    const updated = await tx.internProfile.update({
      where: { id: internId },
      data: { enrollmentStatus: "REJECTED", rejectionReason: reason, enrolledByUserId: actor.id },
    });
    await writeAuditLog(
      {
        actor,
        action: "INTERN_ENROLLMENT_REJECT",
        entityType: "InternProfile",
        entityId: internId,
        diff: { before: { status: "PENDING" }, after: { status: "REJECTED", reason } } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );
    return updated;
  });
}
