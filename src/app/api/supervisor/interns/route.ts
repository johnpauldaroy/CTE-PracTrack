import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { createInternSchema } from "@/lib/validation/account";
import { createInternBySupervisor } from "@/lib/services/account-service";
import { listInternsForSchool } from "@/lib/services/intern-service";
import { getActiveShifting } from "@/lib/services/shifting-service";
import { ForbiddenError } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireSession();
    if (user.role !== "SUPERVISOR" || !user.supervisorSchoolId) {
      throw new ForbiddenError("Only a supervisor with an assigned school can view this list.");
    }
    const activeShifting = await getActiveShifting();
    const interns = await listInternsForSchool(user, user.supervisorSchoolId, activeShifting?.id ?? null);
    return NextResponse.json({ interns });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const input = createInternSchema.parse(body);
    const intern = await createInternBySupervisor(user, input);
    return NextResponse.json({ intern }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
