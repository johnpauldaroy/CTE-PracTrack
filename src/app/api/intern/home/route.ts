import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/session";
import { getFlaggingRuleConfig } from "@/lib/check-in-config";

export async function GET() {
  try {
    const user = await requireSession();
    if (user.role !== "STUDENT_INTERN" || !user.internProfileId) {
      throw new ForbiddenError("Only a student intern can view this.");
    }

    const intern = await prisma.internProfile.findUniqueOrThrow({
      where: { id: user.internProfileId },
      include: { assignedSchool: true },
    });

    const activeShifting = await prisma.shifting.findFirst({ where: { status: "ACTIVE" } });
    if (!activeShifting) {
      return NextResponse.json({ intern: { name: user.name, schoolName: intern.assignedSchool.name }, activeShifting: null });
    }

    const [regularSessions, finalDemos, absences, evaluations] = await Promise.all([
      prisma.teachingSession.count({
        where: { internId: intern.id, shiftingId: activeShifting.id, type: "REGULAR" },
      }),
      prisma.teachingSession.count({
        where: { internId: intern.id, shiftingId: activeShifting.id, type: "FINAL_DEMO" },
      }),
      prisma.attendanceRecord.count({
        where: { internId: intern.id, shiftingId: activeShifting.id, status: "ABSENT" },
      }),
      prisma.evaluation.findMany({
        where: { session: { internId: intern.id, shiftingId: activeShifting.id } },
        select: { overallScore: true },
      }),
    ]);

    const avgScore =
      evaluations.length > 0
        ? evaluations.reduce((sum, e) => sum + Number(e.overallScore), 0) / evaluations.length
        : null;

    const flaggingConfig = await getFlaggingRuleConfig();

    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((activeShifting.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    return NextResponse.json({
      intern: { name: user.name, schoolName: intern.assignedSchool.name },
      activeShifting: {
        name: activeShifting.name,
        endDate: activeShifting.endDate,
        daysRemaining,
        requiredTeachingSessions: activeShifting.requiredTeachingSessions,
        requiredFinalDemos: activeShifting.requiredFinalDemos,
        regularSessionsCompleted: regularSessions,
        finalDemosCompleted: finalDemos,
      },
      stats: {
        absences,
        sessionsProgress: `${regularSessions}/${activeShifting.requiredTeachingSessions}`,
        avgScore,
      },
      flaggingConfig: { absenceEarlyWarning: flaggingConfig.absenceEarlyWarning },
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
