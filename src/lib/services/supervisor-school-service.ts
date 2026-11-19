import { writeAuditLog } from "@/lib/audit";
import { ConflictError, FieldValidationError, ForbiddenError } from "@/lib/session";
import type { SessionUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Makes a supervisor's school list exactly `schoolIds` (admin only). A supervisor
 * may cover several schools; a school has at most one supervisor, so a school that
 * already belongs to someone else is rejected rather than silently taken over.
 * Every change is written to SchoolSupervisorHistory (PRD §6.2) and the audit log.
 * Runs inside the caller's transaction so it commits with the rest of the change.
 */
export async function syncSupervisorSchools(
  tx: Prisma.TransactionClient,
  actor: SessionUser,
  supervisor: { profileId: string; userId: string; name: string },
  schoolIds: string[],
) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only the CTE office can assign schools to a supervisor.");
  const wanted = [...new Set(schoolIds)];

  const [schools, currentLinks] = await Promise.all([
    tx.school.findMany({
      where: { id: { in: wanted }, deletedAt: null },
      select: { id: true, name: true, supervisorLink: { select: { supervisorProfileId: true, supervisorProfile: { select: { user: { select: { name: true } } } } } } },
    }),
    tx.supervisorSchool.findMany({
      where: { supervisorProfileId: supervisor.profileId },
      include: { school: { select: { name: true } } },
    }),
  ]);

  if (schools.length !== wanted.length) {
    throw new FieldValidationError({ schoolIds: ["One of the selected schools no longer exists."] });
  }
  const taken = schools.filter(
    (school) => school.supervisorLink && school.supervisorLink.supervisorProfileId !== supervisor.profileId,
  );
  if (taken.length) {
    throw new ConflictError(
      taken
        .map((school) => `${school.name} already has a supervisor (${school.supervisorLink?.supervisorProfile.user.name}).`)
        .join(" ") + " Unassign them first.",
    );
  }

  const currentIds = new Set(currentLinks.map((link) => link.schoolId));
  const removed = currentLinks.filter((link) => !wanted.includes(link.schoolId));
  const added = schools.filter((school) => !currentIds.has(school.id));
  if (!removed.length && !added.length) return { added: [], removed: [] };

  if (removed.length) {
    await tx.supervisorSchool.deleteMany({ where: { id: { in: removed.map((link) => link.id) } } });
    await tx.schoolSupervisorHistory.updateMany({
      where: { schoolId: { in: removed.map((link) => link.schoolId) }, supervisorUserId: supervisor.userId, unassignedAt: null },
      data: { unassignedAt: new Date() },
    });
  }
  for (const school of added) {
    await tx.supervisorSchool.create({ data: { supervisorProfileId: supervisor.profileId, schoolId: school.id } });
    await tx.schoolSupervisorHistory.create({
      data: { schoolId: school.id, supervisorUserId: supervisor.userId, assignedByUserId: actor.id },
    });
  }

  await writeAuditLog(
    {
      actor,
      action: "SUPERVISOR_SCHOOLS_SET",
      entityType: "SupervisorProfile",
      entityId: supervisor.profileId,
      diff: {
        before: { supervisorName: supervisor.name, schools: currentLinks.map((link) => link.school.name).join(", ") || "None" },
        after: {
          supervisorName: supervisor.name,
          schools:
            [...currentLinks.filter((link) => wanted.includes(link.schoolId)).map((link) => link.school.name), ...added.map((school) => school.name)]
              .join(", ") || "None",
        },
      } as unknown as Prisma.InputJsonValue,
    },
    tx,
  );

  return { added: added.map((school) => school.id), removed: removed.map((link) => link.schoolId) };
}
