import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { getProgressReportUrl } from "@/lib/services/progress-report-service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json({ url: await getProgressReportUrl(await requireSession(), id) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
