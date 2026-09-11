import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { listInterns } from "@/lib/services/account-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const schoolId = searchParams.get("schoolId") ?? undefined;
    const interns = await listInterns(user, { search, schoolId });
    return NextResponse.json({ interns });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
