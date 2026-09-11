import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { assertSchoolInScope } from "@/lib/scope";
import { listResolvedAlertsForSchool } from "@/lib/services/alert-query-service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    assertSchoolInScope(user, id);
    const alerts = await listResolvedAlertsForSchool(user, id);
    return NextResponse.json({ alerts });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
