import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { createInternSchema } from "@/lib/validation/account";
import { createIntern } from "@/lib/services/account-service";
import { listInternsForSchool } from "@/lib/services/intern-service";
import { getActiveShifting } from "@/lib/services/shifting-service";
import { ForbiddenError } from "@/lib/session";
import { assertSchoolInScope, scopeToRole } from "@/lib/scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    if (user.role !== "SUPERVISOR" || !user.supervisorSchoolIds?.length) {
      throw new ForbiddenError("Only a supervisor with an assigned school can view this list.");
    }
    // Optional ?schoolId= narrows the list to one of the supervisor's schools.
    const schoolId = new URL(request.url).searchParams.get("schoolId");
    if (schoolId) assertSchoolInScope(user, schoolId);
    const activeShifting = await getActiveShifting();
    const interns = await listInternsForSchool(user, schoolId, activeShifting?.id ?? null);
    // The supervisor's own partner school(s), by name (scope comes from the session).
    const schools = await prisma.school.findMany({
      where: { ...scopeToRole.school(user), deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      schools,
      interns,
      activeShifting: activeShifting
        ? {
            id: activeShifting.id,
            requiredTeachingSessions: activeShifting.requiredTeachingSessions,
          }
        : null,
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const input = createInternSchema.parse(body);
    const intern = await createIntern(user, input);
    return NextResponse.json({ intern }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
