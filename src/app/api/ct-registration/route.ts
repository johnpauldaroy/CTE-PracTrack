import { NextRequest, NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/api-error";
import { assertWithinRateLimit, clientKey, RateLimitError } from "@/lib/rate-limit";
import { ctRegistrationSchema } from "@/lib/validation/ct-registration";
import { registerCooperatingTeacher } from "@/lib/services/ct-registration-service";

// Intentionally unauthenticated — this is the one public write in the app.
export async function POST(request: NextRequest) {
  try {
    assertWithinRateLimit(clientKey(request, "register-ct"), 5);
    const body = await request.json();
    const input = ctRegistrationSchema.parse(body);
    await registerCooperatingTeacher(input);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    return toApiErrorResponse(error);
  }
}
