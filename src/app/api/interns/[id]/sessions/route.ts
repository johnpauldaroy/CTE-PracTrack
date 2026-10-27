import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { internShiftingQuerySchema } from "@/lib/validation/session";
import { listInternSessions } from "@/lib/services/session-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const { shiftingId } = internShiftingQuerySchema.parse({ shiftingId: request.nextUrl.searchParams.get("shiftingId") ?? "" });
    return NextResponse.json(await listInternSessions(user, id, shiftingId));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
