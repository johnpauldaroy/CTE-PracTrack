import { NextRequest, NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/api-error";
import { assertWithinRateLimit, clientKey, RateLimitError } from "@/lib/rate-limit";
import { resendCodeSchema, verifyEmailSchema } from "@/lib/validation/intern-registration";
import { resendVerificationCode, verifyInternEmail } from "@/lib/services/intern-registration-service";

/** POST checks the code. */
export async function POST(request: NextRequest) {
  try {
    assertWithinRateLimit(clientKey(request, "verify-email"), 10);
    const input = verifyEmailSchema.parse(await request.json());
    return NextResponse.json(await verifyInternEmail(input.email, input.code));
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    return toApiErrorResponse(error);
  }
}

/** PUT asks for a fresh code. Always answers success so it cannot be used to discover registered emails. */
export async function PUT(request: NextRequest) {
  try {
    assertWithinRateLimit(clientKey(request, "resend-code"), 3);
    const input = resendCodeSchema.parse(await request.json());
    await resendVerificationCode(input.email);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    return toApiErrorResponse(error);
  }
}
