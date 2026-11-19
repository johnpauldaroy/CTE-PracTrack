import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { markNoDutySchema } from "@/lib/validation/no-duty";
import { listNoDutyDays, markNoDuty } from "@/lib/services/no-duty-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const params = request.nextUrl.searchParams;
    const shiftingId = params.get("shiftingId");
    if (!shiftingId) return NextResponse.json({ error: "shiftingId is required" }, { status: 422 });
    const days = await listNoDutyDays(user, { shiftingId, internId: params.get("internId") ?? undefined });
    return NextResponse.json({ days });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const input = markNoDutySchema.parse(await request.json());
    const result = await markNoDuty(user, input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
