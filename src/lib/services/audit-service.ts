import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/session";
import { formatManila, manilaTimeOnDateToUtc } from "@/lib/timezone";
import { actionLabel, auditChanges, summarizeAudit, type AuditChangeRow, type NameLookup } from "@/lib/audit-format";
import type { SessionUser } from "@/lib/auth";
import type { Prisma, Role } from "@/generated/prisma/client";

export const AUDIT_PAGE_SIZE = 50;

export interface AuditLogFilters {
  action?: string;
  role?: Role;
  /** yyyy-MM-dd, Asia/Manila calendar day (inclusive). */
  from?: string;
  to?: string;
  q?: string;
  page?: number;
}

export interface AuditLogView {
  id: string;
  when: string;
  actorName: string;
  actorRole: Role;
  action: string;
  actionLabel: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  summary: string;
  changes: AuditChangeRow[];
  rawDiff: string | null;
}

function dayStart(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return manilaTimeOnDateToUtc(new Date(Date.UTC(y, m - 1, d)), "00:00");
}

function buildWhere(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (filters.action) where.action = filters.action;
  if (filters.role) where.actorRole = filters.role;
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: dayStart(filters.from) } : {}),
      // `to` is inclusive: everything before the start of the following Manila day.
      ...(filters.to ? { lt: new Date(dayStart(filters.to).getTime() + 86_400_000) } : {}),
    };
  }
  if (filters.q) {
    where.OR = [
      { actorUser: { name: { contains: filters.q, mode: "insensitive" } } },
      { action: { contains: filters.q.replace(/\s+/g, "_"), mode: "insensitive" } },
      { entityId: filters.q },
    ];
  }
  return where;
}

/** Admin-only, paginated, filtered audit log with plain-language summaries. */
export async function listAuditLogs(actor: SessionUser, filters: AuditLogFilters = {}) {
  if (actor.role !== "ADMIN") throw new ForbiddenError();
  const where = buildWhere(filters);
  const page = Math.max(1, filters.page ?? 1);

  const [total, rows, actionRows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { actorUser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);

  const names = await resolveNames(rows);
  const logs: AuditLogView[] = rows.map((row) => ({
    id: row.id,
    when: formatManila(row.createdAt, "MMM d, yyyy h:mm a"),
    actorName: row.actorUser.name,
    actorRole: row.actorRole,
    action: row.action,
    actionLabel: actionLabel(row.action),
    entityType: row.entityType,
    entityId: row.entityId,
    entityName: names[row.entityId] ?? null,
    summary: summarizeAudit(
      { action: row.action, entityType: row.entityType, entityId: row.entityId, actorName: row.actorUser.name, diff: row.diff },
      names,
    ),
    changes: auditChanges(row.action, row.diff, names),
    rawDiff: row.diff ? JSON.stringify(row.diff, null, 2) : null,
  }));

  return {
    logs,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
    actions: actionRows.map((row) => ({ value: row.action, label: actionLabel(row.action) })),
  };
}

const SHIFTING_LABEL = { FIRST: "First Shifting", SECOND: "Second Shifting" } as const;

function collectIds(rows: { entityType: string; entityId: string; diff: Prisma.JsonValue }[]) {
  const byType = new Map<string, Set<string>>();
  const referenced = new Set<string>();
  const add = (type: string, id: string) => {
    if (!byType.has(type)) byType.set(type, new Set());
    byType.get(type)!.add(id);
  };
  for (const row of rows) {
    add(row.entityType, row.entityId);
    const diff = row.diff && typeof row.diff === "object" && !Array.isArray(row.diff) ? row.diff : null;
    for (const side of [diff?.before, diff?.after]) {
      if (!side || typeof side !== "object" || Array.isArray(side)) continue;
      for (const [key, value] of Object.entries(side)) {
        if (/Id$/.test(key) && typeof value === "string") referenced.add(value);
      }
    }
  }
  return { byType, referenced };
}

/**
 * Display names for every id on the page: the entity each entry is about, and
 * ids referenced inside diffs (schools, supervisors, CTs, shiftings, …). One
 * query per table, only for the ids present.
 */
async function resolveNames(rows: { entityType: string; entityId: string; diff: Prisma.JsonValue }[]): Promise<NameLookup> {
  const { byType, referenced } = collectIds(rows);
  const ids = (type: string) => [...(byType.get(type) ?? []), ...referenced];
  const names: NameLookup = {};
  const internName = { user: { select: { name: true } } } as const;

  const [schools, users, interns, cts, supervisors, shiftings, semesters, sessions, attendance, alerts, evaluations, documents, submissions, years] =
    await Promise.all([
      prisma.school.findMany({ where: { id: { in: ids("School") } }, select: { id: true, name: true } }),
      prisma.user.findMany({ where: { id: { in: ids("User") } }, select: { id: true, name: true } }),
      prisma.internProfile.findMany({ where: { id: { in: ids("InternProfile") } }, select: { id: true, ...internName } }),
      prisma.cooperatingTeacherProfile.findMany({ where: { id: { in: ids("CooperatingTeacherProfile") } }, select: { id: true, ...internName } }),
      prisma.supervisorProfile.findMany({ where: { id: { in: ids("SupervisorProfile") } }, select: { id: true, ...internName } }),
      prisma.shifting.findMany({
        where: { id: { in: ids("Shifting") } },
        select: { id: true, name: true, semester: { select: { name: true, academicYear: { select: { label: true } } } } },
      }),
      prisma.semester.findMany({
        where: { id: { in: [...(byType.get("Semester") ?? [])] } },
        select: { id: true, name: true, academicYear: { select: { label: true } } },
      }),
      prisma.teachingSession.findMany({
        where: { id: { in: ids("TeachingSession") } },
        select: { id: true, sessionNumber: true, intern: { select: internName } },
      }),
      prisma.attendanceRecord.findMany({
        where: { id: { in: [...(byType.get("AttendanceRecord") ?? [])] } },
        select: { id: true, date: true, intern: { select: internName } },
      }),
      prisma.alert.findMany({
        where: { id: { in: [...(byType.get("Alert") ?? [])] } },
        select: { id: true, type: true, intern: { select: internName } },
      }),
      prisma.evaluation.findMany({
        where: { id: { in: [...(byType.get("Evaluation") ?? [])] } },
        select: { id: true, session: { select: { sessionNumber: true, intern: { select: internName } } } },
      }),
      prisma.sessionDocument.findMany({
        where: { id: { in: [...(byType.get("SessionDocument") ?? [])] } },
        select: { id: true, session: { select: { sessionNumber: true, intern: { select: internName } } } },
      }),
      prisma.endOfTermSubmission.findMany({
        where: { id: { in: [...(byType.get("EndOfTermSubmission") ?? [])] } },
        select: { id: true, intern: { select: internName } },
      }),
      prisma.academicYear.findMany({
        where: { id: { in: [...(byType.get("AcademicYear") ?? [])] } },
        select: { id: true, label: true },
      }),
    ]);

  for (const row of schools) names[row.id] = row.name;
  for (const row of users) names[row.id] = row.name;
  for (const row of [...interns, ...cts, ...supervisors]) names[row.id] = row.user.name;
  for (const row of shiftings) {
    names[row.id] = `${SHIFTING_LABEL[row.name]}, ${row.semester.name} ${row.semester.academicYear.label}`;
  }
  for (const row of semesters) names[row.id] = `${row.name} ${row.academicYear.label}`;
  for (const row of sessions) names[row.id] = `teaching session #${row.sessionNumber} for ${row.intern.user.name}`;
  for (const row of attendance) names[row.id] = `${row.intern.user.name} on ${formatManila(row.date, "MMM d, yyyy")}`;
  for (const row of alerts) {
    const type = row.type.charAt(0) + row.type.slice(1).toLowerCase().replace(/_/g, " ");
    names[row.id] = `${type} — ${row.intern.user.name}`;
  }
  for (const row of [...evaluations, ...documents]) {
    names[row.id] = `${row.session.intern.user.name}'s session #${row.session.sessionNumber}`;
  }
  for (const row of submissions) names[row.id] = row.intern.user.name;
  for (const row of years) names[row.id] = `Academic Year ${row.label}`;
  // Singletons.
  for (const id of byType.get("FlaggingRuleConfig") ?? []) names[id] = "the flagging rules";
  for (const id of byType.get("CheckInConfig") ?? []) names[id] = "the global check-in times";
  return names;
}
