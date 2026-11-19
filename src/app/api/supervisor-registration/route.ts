import { NextRequest, NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/api-error";
import { assertWithinRateLimit, clientKey, RateLimitError } from "@/lib/rate-limit";
import { supervisorRegistrationSchema } from "@/lib/validation/supervisor-registration";
import { registerSupervisor } from "@/lib/services/supervisor-registration-service";

// Intentionally unauthenticated, like the CT registration: one of the few public writes.
export async function POST(request: NextRequest) {
  try {
    assertWithinRateLimit(clientKey(request, "register-supervisor"), 5);
    const body = await request.json();
    // Honeypot: real users never fill this hidden field, bots usually do.
    if (typeof body?.website === "string" && body.website.trim() !== "") {
      return NextResponse.json({ success: true }, { status: 201 });
    }
    const input = supervisorRegistrationSchema.parse(body);
    await registerSupervisor(input);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    return toApiErrorResponse(error);
  }
}
