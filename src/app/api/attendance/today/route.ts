import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { getTodayAttendance } from "@/lib/services/attendance-service";

export async function GET() {
  try {
    const user = await requireSession();
    const result = await getTodayAttendance(user);
    return NextResponse.json(result);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
