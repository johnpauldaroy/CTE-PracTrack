import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { assertSchoolInScope } from "@/lib/scope";
import { listInternsForSchool } from "@/lib/services/intern-service";
import { getActiveShifting } from "@/lib/services/shifting-service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    assertSchoolInScope(user, id);
    const activeShifting = await getActiveShifting();
    const interns = await listInternsForSchool(user, id, activeShifting?.id ?? null);
    return NextResponse.json({ interns, activeShiftingId: activeShifting?.id ?? null });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
