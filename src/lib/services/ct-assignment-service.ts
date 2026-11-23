import { prisma } from "@/lib/prisma";
import { scopeToRole } from "@/lib/scope";
import { writeAuditLog } from "@/lib/audit";
import { FieldValidationError, ForbiddenError } from "@/lib/session";
import type { SessionUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

/**
 * Cooperating teacher <-> intern pairing is strictly 1:1 and is the supervisor's job (admin may step in).
 * Intern -> one CT holds because it is a single column; CT -> one intern holds because that column is UNIQUE.
 */
function requirePairingRole(actor: SessionUser) {
  if (actor.role !== "ADMIN" && actor.role !== "SUPERVISOR") throw new ForbiddenError("Only a supervisor can pair teachers with interns.");
}

/** A school's teachers, each with who they are paired with (if anyone). */
const ctInclude = {
  user: { select: { name: true, email: true, phone: true } },
  assignedIntern: { select: { id: true, user: { select: { name: true } } } },
} satisfies Prisma.CooperatingTeacherProfileInclude;

/** Options for the per-intern picker: the CTs of the intern's school, each marked paired / free. */
export async function getCtAssignmentOptions(actor: SessionUser, internId: string) {
  requirePairingRole(actor);
  const intern = await prisma.internProfile.findFirst({ where: { ...scopeToRole.intern(actor), id: internId } });
  if (!intern) throw new ForbiddenError("Intern is outside your scope.");
  const cts = await prisma.cooperatingTeacherProfile.findMany({
    where: { schoolId: intern.assignedSchoolId, user: { status: "ACTIVE", deletedAt: null } },
    include: ctInclude,
    orderBy: { user: { name: "asc" } },
  });
  return { currentId: intern.cooperatingTeacherId, cts };
}

/**
 * The supervisor's pairing board: cooperating teachers of every school in scope (never a client-supplied
 * school) and the enrolled interns who still have no teacher.
 */
export async function getPairingBoard(actor: SessionUser) {
  requirePairingRole(actor);
  const [cts, unpairedInterns] = await Promise.all([
    prisma.cooperatingTeacherProfile.findMany({
      where: { school: scopeToRole.school(actor), user: { status: "ACTIVE", deletedAt: null } },
      include: { ...ctInclude, school: { select: { id: true, name: true } } },
      orderBy: [{ school: { name: "asc" } }, { user: { name: "asc" } }],
    }),
    prisma.internProfile.findMany({
      where: {
        ...scopeToRole.intern(actor),
        enrollmentStatus: "ENROLLED",
        cooperatingTeacherId: null,
        user: { deletedAt: null, status: { in: ["ACTIVE", "LOCKED"] } },
      },
      select: { id: true, assignedSchoolId: true, course: true, yearLevel: true, user: { select: { name: true } }, section: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);
  return { cts, unpairedInterns };
}

/** Pairs an intern with a teacher, or (ctId = null) removes the pairing. */
export async function assignCt(actor: SessionUser, internId: string, ctId: string | null) {
  requirePairingRole(actor);
  const intern = await prisma.internProfile.findFirst({
    where: { ...scopeToRole.intern(actor), id: internId },
    include: { user: { select: { id: true, name: true } }, cooperatingTeacher: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!intern) throw new ForbiddenError("Intern is outside your scope.");
  if (intern.cooperatingTeacherId === ctId) return intern;

  let newCt: { id: string; userId: string; user: { name: string }; assignedIntern: { id: string; user: { name: string } } | null } | null = null;
  if (ctId) {
    newCt = await prisma.cooperatingTeacherProfile.findFirst({
      where: { id: ctId, schoolId: intern.assignedSchoolId, user: { status: "ACTIVE", deletedAt: null } },
      select: { id: true, userId: true, user: { select: { name: true } }, assignedIntern: { select: { id: true, user: { select: { name: true } } } } },
    });
    if (!newCt) throw new FieldValidationError({ cooperatingTeacherId: ["Select an active cooperating teacher from the intern's school."] });
    if (newCt.assignedIntern && newCt.assignedIntern.id !== internId) {
      throw new FieldValidationError({ cooperatingTeacherId: [`${newCt.user.name} is already paired with ${newCt.assignedIntern.user.name}. Unpair them first.`] });
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.internProfile.update({ where: { id: internId }, data: { cooperatingTeacherId: ctId } });
      await writeAuditLog(
        {
          actor,
          action: "INTERN_CT_ASSIGN",
          entityType: "InternProfile",
          entityId: internId,
          diff: {
            before: { cooperatingTeacherId: intern.cooperatingTeacherId, cooperatingTeacherName: intern.cooperatingTeacher?.user.name ?? null },
            after: { cooperatingTeacherId: ctId, cooperatingTeacherName: newCt?.user.name ?? null },
          } as Prisma.InputJsonValue,
        },
        tx,
      );

      const notices: Prisma.NotificationCreateManyInput[] = [];
      if (intern.cooperatingTeacher) {
        notices.push({ userId: intern.cooperatingTeacher.user.id, type: "INTERN_CT_UNPAIRED", title: "Intern pairing ended", body: `You are no longer paired with ${intern.user.name}.`, href: "/m/ct" });
        notices.push({ userId: intern.user.id, type: "INTERN_CT_UNPAIRED", title: "Cooperating teacher changed", body: `${intern.cooperatingTeacher.user.name} is no longer your cooperating teacher.`, href: "/m/intern" });
      }
      if (newCt) {
        notices.push({ userId: newCt.userId, type: "INTERN_CT_PAIRED", title: "You have been paired with an intern", body: `${intern.user.name} is now your intern.`, href: "/m/ct" });
        notices.push({ userId: intern.user.id, type: "INTERN_CT_PAIRED", title: "Cooperating teacher assigned", body: `${newCt.user.name} is your cooperating teacher.`, href: "/m/intern" });
      }
      if (notices.length) await tx.notification.createMany({ data: notices });
      return updated;
    });
  } catch (error) {
    // Two supervisors paired the same teacher at once: the UNIQUE index decides.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new FieldValidationError({ cooperatingTeacherId: ["That teacher was just paired with another intern. Refresh and choose again."] });
    }
    throw error;
  }
}
