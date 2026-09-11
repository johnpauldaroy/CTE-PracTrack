import { prisma } from "@/lib/prisma";
import { scopeToRole } from "@/lib/scope";
import type { SessionUser } from "@/lib/auth";

/** Resolved alerts for one school, newest first (PRD §6.2 School detail — Resolved Alerts tab). */
export async function listResolvedAlertsForSchool(user: SessionUser, schoolId: string) {
  return prisma.alert.findMany({
    where: {
      ...scopeToRole.alert(user),
      status: "RESOLVED",
      intern: { assignedSchoolId: schoolId },
    },
    include: {
      intern: { include: { user: true } },
      resolvedByUser: true,
    },
    orderBy: { resolvedAt: "desc" },
  });
}
