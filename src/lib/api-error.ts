import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError, ForbiddenError } from "@/lib/session";

/**
 * Converts a thrown error into the right HTTP response. Zod errors become a
 * 422 with per-field messages (CLAUDE.md: "return per-field errors, not a
 * generic 400") rather than a flat string.
 */
export function toApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof Error) {
    // eslint-disable-next-line no-console
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  // eslint-disable-next-line no-console
  console.error(error);
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}
