import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { attendancePunchSchema } from "@/lib/validation/attendance";
import { timeIn } from "@/lib/services/attendance-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const input = attendancePunchSchema.parse(body);
    const record = await timeIn(user, input);
    return NextResponse.json({ record });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
