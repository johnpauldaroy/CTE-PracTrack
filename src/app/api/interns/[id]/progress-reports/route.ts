import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { listInternProgressReports } from "@/lib/services/progress-report-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    const { id } = await params;
    const shiftingId = request.nextUrl.searchParams.get("shiftingId");
    if (!shiftingId) return NextResponse.json({ error: "shiftingId is required" }, { status: 422 });
    return NextResponse.json({ periods: await listInternProgressReports(actor, id, shiftingId) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
