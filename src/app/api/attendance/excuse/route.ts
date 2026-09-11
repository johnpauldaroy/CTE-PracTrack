import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { markExcusedSchema } from "@/lib/validation/attendance";
import { markExcused } from "@/lib/services/excuse-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const input = markExcusedSchema.parse(body);
    const record = await markExcused(user, input);
    return NextResponse.json({ record });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
