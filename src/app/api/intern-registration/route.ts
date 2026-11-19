import { NextRequest, NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/api-error";
import { assertWithinRateLimit, clientKey, RateLimitError } from "@/lib/rate-limit";
import { internRegistrationSchema } from "@/lib/validation/intern-registration";
import { registerIntern } from "@/lib/services/intern-registration-service";

// Intentionally unauthenticated, like the CT and supervisor registrations.
export async function POST(request: NextRequest) {
  try {
    assertWithinRateLimit(clientKey(request, "register-intern"), 5);
    const body = await request.json();
    // Honeypot: real users never fill this hidden field.
    if (typeof body?.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ success: true }, { status: 201 });
    }
    const input = internRegistrationSchema.parse(body);
    const result = await registerIntern(input);
    return NextResponse.json({ success: true, email: result.email }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    return toApiErrorResponse(error);
  }
}
