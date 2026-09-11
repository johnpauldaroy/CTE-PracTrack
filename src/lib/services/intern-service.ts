import { prisma } from "@/lib/prisma";
import { scopeToRole } from "@/lib/scope";
import { materializeAttendanceRecords } from "@/lib/services/dtr-service";
import type { SessionUser } from "@/lib/auth";

/** Interns for one school, with session/absence counts for the active shifting. */
export async function listInternsForSchool(user: SessionUser, schoolId: string, shiftingId: string | null) {
  const shifting = shiftingId
    ? await prisma.shifting.findUnique({ where: { id: shiftingId } })
    : null;
  const interns = await prisma.internProfile.findMany({
    where: { ...scopeToRole.intern(user), assignedSchoolId: schoolId },
    include: {
      user: true,
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

  return interns.map((intern) => {
    const regularSessions = shiftingId
      ? intern.teachingSessions.filter((s) => s.type === "REGULAR").length
      : 0;
    const absences = shifting
      ? materializeAttendanceRecords(intern.attendanceRecords, shifting).filter(
          (record) => record.status === "ABSENT",
        ).length
      : 0;
    const isBehind = shiftingId
      ? intern.alerts.some((alert) => alert.type === "BEHIND_PACE")
      : false;
    const isFlagged = shiftingId ? intern.alerts.length > 0 : false;

    return {
      id: intern.id,
      schoolNumber: intern.schoolNumber,
      name: intern.user.name,
      email: intern.user.email,
      course: intern.course,
      yearLevel: intern.yearLevel,
      sessionsLogged: regularSessions,
      absences,
      isBehind,
      isFlagged,
    };
  });
}
