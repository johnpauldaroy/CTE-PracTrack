import { prisma } from "@/lib/prisma";
import { scopeToRole } from "@/lib/scope";
import type { SessionUser } from "@/lib/auth";

/** Interns for one school, with session/absence counts for the active shifting. */
export async function listInternsForSchool(user: SessionUser, schoolId: string, shiftingId: string | null) {
  const interns = await prisma.internProfile.findMany({
    where: { ...scopeToRole.intern(user), assignedSchoolId: schoolId },
    include: {
      user: true,
      teachingSessions: shiftingId
        ? { where: { shiftingId }, select: { id: true, type: true } }
        : false,
      attendanceRecords: shiftingId
        ? { where: { shiftingId }, select: { status: true } }
        : false,
    },
    orderBy: { schoolNumber: "asc" },
  });

  return interns.map((intern) => {
    const regularSessions = shiftingId
      ? intern.teachingSessions.filter((s) => s.type === "REGULAR").length
      : 0;
    const absences = shiftingId
      ? intern.attendanceRecords.filter((r) => r.status === "ABSENT").length
      : 0;

    return {
      id: intern.id,
      schoolNumber: intern.schoolNumber,
      name: intern.user.name,
      email: intern.user.email,
      course: intern.course,
      yearLevel: intern.yearLevel,
      sessionsLogged: regularSessions,
      absences,
    };
  });
}
