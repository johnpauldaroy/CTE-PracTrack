import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { getDtr } from "@/lib/services/dtr-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const shiftingId = searchParams.get("shiftingId");
    if (!shiftingId) {
      return NextResponse.json({ error: "shiftingId is required" }, { status: 422 });
    }
    const dtr = await getDtr(user, id, shiftingId);
    return NextResponse.json(dtr);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
