import { NextRequest, NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/api-error";
import { ctRegistrationSchema } from "@/lib/validation/ct-registration";
import { registerCooperatingTeacher } from "@/lib/services/ct-registration-service";

// Intentionally unauthenticated — this is the one public write in the app.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = ctRegistrationSchema.parse(body);
    await registerCooperatingTeacher(input);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
