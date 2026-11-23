import { prisma } from "@/lib/prisma";
import { scopeToRole } from "@/lib/scope";
import { ForbiddenError } from "@/lib/session";
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

export const RESOLUTIONS_PAGE_SIZE = 10;

/**
 * The CTE office's view of every resolved alert with the supervisor's note. Alerts resolved together
 * (same student, same person, same note) are shown as one entry. Admin only.
 */
export async function listResolutions(
  actor: SessionUser,
  filters: { q?: string; schoolId?: string; page?: number } = {},
) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only the CTE office can review resolutions.");
  const alerts = await prisma.alert.findMany({
    where: {
      status: "RESOLVED",
      ...(filters.schoolId ? { intern: { assignedSchoolId: filters.schoolId } } : {}),
      ...(filters.q
        ? {
            OR: [
              { intern: { user: { name: { contains: filters.q, mode: "insensitive" } } } },
              { resolutionNote: { contains: filters.q, mode: "insensitive" } },
              { resolvedByUser: { name: { contains: filters.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      intern: { select: { user: { select: { name: true } }, assignedSchool: { select: { id: true, name: true } } } },
      resolvedByUser: { select: { name: true } },
    },
    orderBy: { resolvedAt: "desc" },
  });

  const entries = new Map<string, {
    key: string;
    internName: string;
    schoolName: string;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    note: string | null;
    flags: { id: string; detail: string }[];
  }>();
  for (const alert of alerts) {
    const key = `${alert.internId}|${alert.resolvedByUserId}|${alert.resolutionNote}`;
    const entry = entries.get(key);
    if (entry) entry.flags.push({ id: alert.id, detail: alert.detail });
    else {
      entries.set(key, {
        key,
        internName: alert.intern.user.name,
        schoolName: alert.intern.assignedSchool.name,
        resolvedBy: alert.resolvedByUser?.name ?? null,
        resolvedAt: alert.resolvedAt,
        note: alert.resolutionNote,
        flags: [{ id: alert.id, detail: alert.detail }],
      });
    }
  }
  const all = [...entries.values()];
  const pageCount = Math.max(1, Math.ceil(all.length / RESOLUTIONS_PAGE_SIZE));
  const page = Math.min(Math.max(filters.page ?? 1, 1), pageCount);
  return {
    total: all.length,
    page,
    pageCount,
    entries: all.slice((page - 1) * RESOLUTIONS_PAGE_SIZE, page * RESOLUTIONS_PAGE_SIZE),
  };
}
