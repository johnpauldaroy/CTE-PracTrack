import { prisma } from "@/lib/prisma";
import { scopeToRole } from "@/lib/scope";
import { materializeAttendanceRecords } from "@/lib/services/dtr-service";
import { buildDutyCalendar, loadNonDutyRows } from "@/lib/attendance-calendar";
import { todayManilaDateOnly } from "@/lib/timezone";
import type { SessionUser } from "@/lib/auth";

/**
 * Interns the caller may see, with session/absence counts for the active shifting. `schoolId` only
 * narrows the caller's scope (a supervisor with several schools can look at one); it never widens it.
 * Interns still awaiting enrollment confirmation are not on any roster.
 */
export async function listInternsForSchool(user: SessionUser, schoolId: string | null, shiftingId: string | null) {
  const shifting = shiftingId
    ? await prisma.shifting.findUnique({ where: { id: shiftingId } })
    : null;
  const interns = await prisma.internProfile.findMany({
    where: {
      AND: [scopeToRole.intern(user), schoolId ? { assignedSchoolId: schoolId } : {}],
      enrollmentStatus: "ENROLLED",
    },
    include: {
      user: true,
      assignedSchool: { select: { id: true, name: true } },
      teachingSessions: shiftingId
        ? { where: { shiftingId }, select: { id: true, type: true } }
        : false,
      attendanceRecords: shiftingId
        ? { where: { shiftingId } }
        : false,
      alerts: shiftingId
        ? { where: { shiftingId, status: "ACTIVE" }, select: { type: true } }
        : false,
    },
    orderBy: { schoolNumber: "asc" },
  });

  const today = todayManilaDateOnly().getTime();
  const nonDutyRows = shifting ? await loadNonDutyRows(shifting.id) : [];

  return interns.map((intern) => {
    const regularSessions = shiftingId
      ? intern.teachingSessions.filter((s) => s.type === "REGULAR").length
      : 0;
    const absences = shifting
      ? materializeAttendanceRecords(
          intern.attendanceRecords,
          shifting,
          buildDutyCalendar(shifting, nonDutyRows, { schoolId: intern.assignedSchoolId, internId: intern.id }),
        ).filter(
          (record) => record.status === "ABSENT",
        ).length
      : 0;
    const isBehind = shiftingId
      ? intern.alerts.some((alert) => alert.type === "BEHIND_PACE")
      : false;
    const isFlagged = shiftingId ? intern.alerts.length > 0 : false;
    // "Present today" = timed in today (Asia/Manila day), whether on time, late, or not yet timed out.
    const timedInToday = shiftingId
      ? intern.attendanceRecords.some((record) => record.date.getTime() === today && record.amTimeIn !== null || record.pmTimeIn !== null)
      : false;

    return {
      id: intern.id,
      schoolNumber: intern.schoolNumber,
      schoolId: intern.assignedSchool.id,
      schoolName: intern.assignedSchool.name,
      name: intern.user.name,
      email: intern.user.email,
      course: intern.course,
      yearLevel: intern.yearLevel,
      sessionsLogged: regularSessions,
      absences,
      isBehind,
      isFlagged,
      timedInToday,
    };
  });
}
