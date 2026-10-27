import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { FieldValidationError, ForbiddenError } from "@/lib/session";
import { scopeToRole } from "@/lib/scope";
import type { SessionUser } from "@/lib/auth";
import type {
  EditInternAccountInput,
  CreateSupervisorInput,
  EditSupervisorInput,
  CreateInternInput,
  AdminCreateInternInput,
} from "@/lib/validation/account";
import type { Prisma } from "@/generated/prisma/client";

function requireAdmin(user: SessionUser) {
  if (user.role !== "ADMIN") throw new ForbiddenError("Only the CTE office can manage accounts.");
}

// ── Interns (admin: view/add/edit-for-corrections/delete — PRD §6.3) ──

export async function listInterns(user: SessionUser, opts: { search?: string; schoolId?: string } = {}) {
  requireAdmin(user);
  return prisma.internProfile.findMany({
    where: {
      ...(opts.schoolId ? { assignedSchoolId: opts.schoolId } : {}),
      ...(opts.search
        ? {
            OR: [
              { schoolNumber: { contains: opts.search, mode: "insensitive" } },
              { user: { name: { contains: opts.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { user: true, assignedSchool: true },
    orderBy: { schoolNumber: "asc" },
  });
}

export async function getInternDetail(user: SessionUser, internId: string) {
  const intern = await prisma.internProfile.findFirstOrThrow({
    where: { id: internId, ...scopeToRole.intern(user) },
    include: { user: true, assignedSchool: true, cooperatingTeacher: { include: { user: true } } },
  });
  return intern;
}

export async function updateInternAccount(actor: SessionUser, internId: string, input: EditInternAccountInput) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const before = await tx.internProfile.findFirstOrThrow({
      where: { id: internId },
      include: { user: true },
    });

    const updatedUser = await tx.user.update({
      where: { id: before.userId },
      data: { name: input.name, email: input.email },
    });
    const updatedIntern = await tx.internProfile.update({
      where: { id: internId },
      data: {
        schoolNumber: input.schoolNumber,
        course: input.course,
        assignedSchoolId: input.assignedSchoolId,
      },
    });

    await writeAuditLog(
      {
        actor,
        action: "INTERN_ACCOUNT_UPDATE",
        entityType: "InternProfile",
        entityId: internId,
        diff: {
          before: {
            name: before.user.name,
            email: before.user.email,
            schoolNumber: before.schoolNumber,
            course: before.course,
            assignedSchoolId: before.assignedSchoolId,
          },
          after: input,
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return { ...updatedIntern, user: updatedUser };
  });
}

/** Soft-deletes (deactivates) an intern account. Historical records survive (CLAUDE.md). */
export async function deleteInternAccount(actor: SessionUser, internId: string) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const intern = await tx.internProfile.findFirstOrThrow({ where: { id: internId } });
    const deactivated = await tx.user.update({
      where: { id: intern.userId },
      data: { status: "INACTIVE", deletedAt: new Date() },
    });

    await writeAuditLog(
      { actor, action: "INTERN_ACCOUNT_DELETE", entityType: "InternProfile", entityId: internId },
      tx,
    );

    return deactivated;
  });
}

// ── Supervisors (admin: full CRUD — PRD §6.3) ──

export async function listSupervisors(user: SessionUser) {
  requireAdmin(user);
  return prisma.supervisorProfile.findMany({
    include: { user: true, school: true },
    orderBy: { user: { name: "asc" } },
  });
}

export async function createSupervisor(actor: SessionUser, input: CreateSupervisorInput) {
  requireAdmin(actor);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new Error("An account with this email already exists.");

  return prisma.$transaction(async (tx) => {
    const passwordHash = await bcrypt.hash(input.initialPassword, 10);
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: "SUPERVISOR",
        status: "ACTIVE",
        name: input.name,
        supervisorProfile: {
          create: { department: input.department, schoolId: input.schoolId ?? null },
        },
      },
      include: { supervisorProfile: true },
    });

    if (input.schoolId) {
      await tx.schoolSupervisorHistory.create({
        data: { schoolId: input.schoolId, supervisorUserId: user.id, assignedByUserId: actor.id },
      });
    }

    await writeAuditLog(
      {
        actor,
        action: "SUPERVISOR_CREATE",
        entityType: "User",
        entityId: user.id,
        diff: { after: input as unknown as Prisma.InputJsonValue },
      },
      tx,
    );

    return user;
  });
}

export async function updateSupervisor(actor: SessionUser, supervisorProfileId: string, input: EditSupervisorInput) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const before = await tx.supervisorProfile.findFirstOrThrow({
      where: { id: supervisorProfileId },
      include: { user: true },
    });

    const updatedUser = await tx.user.update({
      where: { id: before.userId },
      data: { name: input.name, email: input.email },
    });
    const updatedProfile = await tx.supervisorProfile.update({
      where: { id: supervisorProfileId },
      data: { department: input.department, schoolId: input.schoolId ?? null },
    });

    await writeAuditLog(
      {
        actor,
        action: "SUPERVISOR_UPDATE",
        entityType: "SupervisorProfile",
        entityId: supervisorProfileId,
        diff: {
          before: { name: before.user.name, email: before.user.email, department: before.department, schoolId: before.schoolId },
          after: input,
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return { ...updatedProfile, user: updatedUser };
  });
}

export async function deleteSupervisor(actor: SessionUser, supervisorProfileId: string) {
  requireAdmin(actor);

  return prisma.$transaction(async (tx) => {
    const profile = await tx.supervisorProfile.findFirstOrThrow({ where: { id: supervisorProfileId } });
    const deactivated = await tx.user.update({
      where: { id: profile.userId },
      data: { status: "INACTIVE", deletedAt: new Date() },
    });

    await writeAuditLog(
      { actor, action: "SUPERVISOR_DELETE", entityType: "SupervisorProfile", entityId: supervisorProfileId },
      tx,
    );

    return deactivated;
  });
}

// ── Intern creation: supervisor (own school, PRD §6.4) or admin (any school) ──

export async function createIntern(actor: SessionUser, input: CreateInternInput | AdminCreateInternInput) {
  let assignedSchoolId: string;
  if (actor.role === "ADMIN") {
    if (!("assignedSchoolId" in input)) throw new FieldValidationError({ assignedSchoolId: ["Select a school"] });
    const school = await prisma.school.findFirst({ where: { id: input.assignedSchoolId, deletedAt: null } });
    if (!school) throw new FieldValidationError({ assignedSchoolId: ["Select an active school"] });
    assignedSchoolId = school.id;
  } else if (actor.role === "SUPERVISOR" && actor.supervisorSchoolId) {
    // A supervisor's school is NEVER taken from input — always their own
    // assigned school, derived from the session.
    assignedSchoolId = actor.supervisorSchoolId;
  } else {
    throw new ForbiddenError("Only the CTE office or a supervisor with an assigned school can add interns.");
  }

  const [emailTaken, numberTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.internProfile.findUnique({
      where: { assignedSchoolId_schoolNumber: { assignedSchoolId, schoolNumber: input.schoolNumber } },
    }),
  ]);
  if (emailTaken || numberTaken) {
    throw new FieldValidationError({
      ...(emailTaken ? { email: ["An account with this email already exists."] } : {}),
      ...(numberTaken ? { schoolNumber: ["This school ID is already used at this school."] } : {}),
    });
  }

  return prisma.$transaction(async (tx) => {
    const passwordHash = await bcrypt.hash(input.initialPassword, 10);
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: "STUDENT_INTERN",
        status: "ACTIVE",
        name: input.name,
        internProfile: {
          create: {
            schoolNumber: input.schoolNumber,
            course: input.course,
            yearLevel: input.yearLevel,
            assignedSchoolId,
            createdByUserId: actor.id,
          },
        },
      },
      include: { internProfile: true },
    });
    const internProfile = user.internProfile;
    if (!internProfile) throw new Error("Failed to create intern profile.");

    await writeAuditLog(
      {
        actor,
        action: "INTERN_ACCOUNT_CREATE",
        entityType: "InternProfile",
        entityId: internProfile.id,
        diff: {
          after: { ...input, initialPassword: undefined, assignedSchoolId },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    // Never return the User row: it carries the password hash.
    return internProfile;
  });
}
