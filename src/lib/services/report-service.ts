import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/session";
import { materializeAttendanceRecords } from "@/lib/services/dtr-service";
import { ensureAlertsFresh } from "@/lib/services/alert-service";
import type { SessionUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

const shiftingInclude = { semester: { include: { academicYear: true } } } as const;

/** Shiftings that can be reported on (active or completed), newest first, for report pickers. */
export async function listReportableShiftings(actor: SessionUser) {
  if (actor.role !== "ADMIN") throw new ForbiddenError();
  return prisma.shifting.findMany({
    where: { status: { in: ["ACTIVE", "COMPLETED"] } },
    include: shiftingInclude,
    orderBy: [{ startDate: "desc" }, { name: "desc" }],
  });
}

/**
 * Attendance, session/document compliance, and alert history for one
 * shifting — the active one by default, or any completed shifting for the
 * read-only archive. Every number is derived from that shifting's rows and
 * requirements; nothing is stored or rewritten (activation never touches
 * historical data, so an archive reads exactly what was recorded).
 */
export async function getReports(actor: SessionUser, options: { shiftingId?: string } = {}) {
  if (actor.role !== "ADMIN") throw new ForbiddenError();
  const shifting = options.shiftingId
    ? await prisma.shifting.findUnique({ where: { id: options.shiftingId }, include: shiftingInclude })
    : await prisma.shifting.findFirst({ where: { status: "ACTIVE" }, include: shiftingInclude });
  const shiftingId = shifting?.id ?? "__none__";
  const isArchive = !!shifting && shifting.status !== "ACTIVE";

  // The data model has no explicit intern↔shifting enrolment. For the active
  // shifting every current intern counts; for an archive, only interns with
  // activity recorded in that shifting do — otherwise interns created later
  // would show up as absent for the whole past shifting.
  const internWhere: Prisma.InternProfileWhereInput = isArchive
    ? {
        OR: [
          { attendanceRecords: { some: { shiftingId } } },
          { teachingSessions: { some: { shiftingId } } },
          { alerts: { some: { shiftingId } } },
          { endOfTermSubmissions: { some: { shiftingId } } },
        ],
      }
    : { user: { deletedAt: null } };

  const schools = await prisma.school.findMany({
    // An archive keeps schools deleted since, as long as they had interns in that shifting.
    where: isArchive ? { OR: [{ deletedAt: null }, { interns: { some: internWhere } }] } : { deletedAt: null },
    include: {
      interns: {
        where: internWhere,
        include: {
          attendanceRecords: { where: { shiftingId } },
          teachingSessions: { where: { shiftingId }, include: { documents: { where: { supersededByDocumentId: null } } } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const attendance = schools.map((school) => {
    let present = 0, absences = 0, excused = 0, late = 0, attended = 0, expected = 0;
    for (const intern of school.interns) {
      const rows = shifting ? materializeAttendanceRecords(intern.attendanceRecords, shifting) : [];
      expected += rows.filter((row) => row.status !== "EXCUSED").length;
      present += rows.filter((row) => row.status === "PRESENT").length;
      late += rows.filter((row) => row.status === "LATE").length;
      absences += rows.filter((row) => row.status === "ABSENT").length;
      excused += rows.filter((row) => row.status === "EXCUSED").length;
      attended += rows.filter((row) => row.status === "PRESENT" || row.status === "LATE").length;
    }
    return {
      schoolId: school.id,
      school: school.name,
      interns: school.interns.length,
      present,
      absences,
      excused,
      late,
      attendanceRate: expected ? Math.round((attended / expected) * 10000) / 100 : 0,
    };
  });

  const compliance = schools.map((school) => {
    let onTrack = 0, behind = 0, sessionsLogged = 0, missingLessonPlans = 0, missingProgressReports = 0;
    for (const intern of school.interns) {
      const sessions = intern.teachingSessions;
      sessionsLogged += sessions.length;
      const evaluated = sessions.filter((s) => s.status === "EVALUATED" && s.type === "REGULAR").length;
      if (shifting && evaluated < shifting.requiredTeachingSessions) behind++;
      else onTrack++;
      for (const session of sessions) {
        if (!session.documents.some((d) => d.type === "LESSON_PLAN")) missingLessonPlans++;
        if (!session.documents.some((d) => d.type === "PROGRESS_REPORT")) missingProgressReports++;
      }
    }
    return { schoolId: school.id, school: school.name, onTrack, behind, sessionsLogged, missingLessonPlans, missingProgressReports };
  });

  const alerts = await prisma.alert.findMany({
    where: { shiftingId },
    include: { intern: { include: { user: true, assignedSchool: true } }, resolvedByUser: true },
    orderBy: [{ status: "asc" }, { raisedAt: "desc" }],
  });
  const resolvedAlerts = alerts.filter((alert) => alert.status === "RESOLVED");

  return { shifting, isArchive, attendance, compliance, alerts, resolvedAlerts };
}

export async function getDashboard(actor: SessionUser) {
  if (actor.role !== "ADMIN") throw new ForbiddenError();
  await ensureAlertsFresh();
  const reports = await getReports(actor);
  const activeAlertWhere = { status: "ACTIVE" as const, shiftingId: reports.shifting?.id ?? "__none__" };
  const [activeAlerts, activeAlertCount] = await Promise.all([
    prisma.alert.findMany({
      where: activeAlertWhere,
      include: { intern: { include: { user: true, assignedSchool: true } } },
      orderBy: [{ severity: "desc" }, { raisedAt: "desc" }],
      take: 10,
    }),
    prisma.alert.count({ where: activeAlertWhere }),
  ]);
  return {
    ...reports,
    activeAlerts,
    totals: {
      schools: reports.attendance.length,
      interns: reports.attendance.reduce((n, row) => n + row.interns, 0),
      absences: reports.attendance.reduce((n, row) => n + row.absences, 0),
      activeAlerts: activeAlertCount,
    },
  };
}
