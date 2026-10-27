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
          user: { select: { name: true } },
          cooperatingTeacher: { include: { user: { select: { name: true } } } },
          attendanceRecords: { where: { shiftingId } },
          teachingSessions: {
            where: { shiftingId },
            include: { documents: { where: { supersededByDocumentId: null } }, evaluation: { select: { overallScore: true } } },
          },
          endOfTermSubmissions: { where: { shiftingId }, select: { type: true, uploadedAt: true } },
          alerts: { where: { shiftingId, status: "ACTIVE" }, select: { id: true } },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });

  // Every figure is computed once per intern; the per-school rows are sums of these.
  const interns = schools.flatMap((school) =>
    school.interns.map((intern) => {
      const rows = shifting ? materializeAttendanceRecords(intern.attendanceRecords, shifting) : [];
      const count = (status: string) => rows.filter((row) => row.status === status).length;
      const present = count("PRESENT"), late = count("LATE"), absences = count("ABSENT"), excused = count("EXCUSED");
      const expected = rows.length - excused;
      const attended = present + late;

      const sessions = intern.teachingSessions;
      const regularEvaluated = sessions.filter((s) => s.status === "EVALUATED" && s.type === "REGULAR").length;
      const finalDemosEvaluated = sessions.filter((s) => s.status === "EVALUATED" && s.type === "FINAL_DEMO").length;
      const scores = sessions.flatMap((s) => (s.evaluation ? [s.evaluation.overallScore] : []));
      const submitted = (type: string) => intern.endOfTermSubmissions.some((e) => e.type === type && e.uploadedAt);

      return {
        internId: intern.id,
        schoolId: school.id,
        school: school.name,
        name: intern.user.name,
        schoolNumber: intern.schoolNumber,
        cooperatingTeacher: intern.cooperatingTeacher?.user.name ?? null,
        present,
        late,
        absences,
        excused,
        attended,
        expected,
        attendanceRate: expected ? Math.round((attended / expected) * 10000) / 100 : 0,
        sessionsLogged: sessions.length,
        regularEvaluated,
        requiredTeachingSessions: shifting?.requiredTeachingSessions ?? 0,
        finalDemosEvaluated,
        requiredFinalDemos: shifting?.requiredFinalDemos ?? 0,
        behind: !!shifting && regularEvaluated < shifting.requiredTeachingSessions,
        // Reference summary only — the system never computes official grades (CLAUDE.md).
        // Decimal math; rounded only when displayed.
        averageScore: scores.length ? scores.reduce((sum, score) => sum.plus(score)).div(scores.length).toString() : null,
        missingLessonPlans: sessions.filter((s) => !s.documents.some((d) => d.type === "LESSON_PLAN")).length,
        missingProgressReports: sessions.filter((s) => !s.documents.some((d) => d.type === "PROGRESS_REPORT")).length,
        narrativeSubmitted: submitted("NARRATIVE_REPORT"),
        portfolioSubmitted: submitted("TEACHING_PORTFOLIO"),
        activeAlerts: intern.alerts.length,
      };
    }),
  );

  const attendance = schools.map((school) => {
    const rows = interns.filter((intern) => intern.schoolId === school.id);
    const sum = (key: "present" | "absences" | "excused" | "late" | "attended" | "expected") =>
      rows.reduce((total, row) => total + row[key], 0);
    const expected = sum("expected");
    return {
      schoolId: school.id,
      school: school.name,
      interns: rows.length,
      present: sum("present"),
      absences: sum("absences"),
      excused: sum("excused"),
      late: sum("late"),
      attendanceRate: expected ? Math.round((sum("attended") / expected) * 10000) / 100 : 0,
    };
  });

  const compliance = schools.map((school) => {
    const rows = interns.filter((intern) => intern.schoolId === school.id);
    const sum = (key: "sessionsLogged" | "missingLessonPlans" | "missingProgressReports") =>
      rows.reduce((total, row) => total + row[key], 0);
    const behind = rows.filter((row) => row.behind).length;
    return {
      schoolId: school.id,
      school: school.name,
      onTrack: rows.length - behind,
      behind,
      sessionsLogged: sum("sessionsLogged"),
      missingLessonPlans: sum("missingLessonPlans"),
      missingProgressReports: sum("missingProgressReports"),
    };
  });

  const alerts = await prisma.alert.findMany({
    where: { shiftingId },
    include: { intern: { include: { user: true, assignedSchool: true } }, resolvedByUser: true },
    orderBy: [{ status: "asc" }, { raisedAt: "desc" }],
  });
  const resolvedAlerts = alerts.filter((alert) => alert.status === "RESOLVED");

  return { shifting, isArchive, attendance, compliance, interns, alerts, resolvedAlerts };
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
