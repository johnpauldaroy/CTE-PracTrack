import { NextRequest, NextResponse } from "next/server";
import { requireSession, ForbiddenError } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { getDtr } from "@/lib/services/dtr-service";

/** The intern's own DTR — self-scoped, no internId needed from the client. */
export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    if (user.role !== "STUDENT_INTERN" || !user.internProfileId) {
      throw new ForbiddenError("Only a student intern can view this.");
    }
    const { searchParams } = new URL(request.url);
    const shiftingId = searchParams.get("shiftingId");
    if (!shiftingId) {
      return NextResponse.json({ error: "shiftingId is required" }, { status: 422 });
    }
    const dtr = await getDtr(user, user.internProfileId, shiftingId);
    return NextResponse.json(dtr);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
