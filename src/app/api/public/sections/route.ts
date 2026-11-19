import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/api-error";
import { listActiveSections } from "@/lib/services/section-service";

// Unauthenticated by design: the intern registration form needs the section picker before the
// registrant has an account. Active sections only; nothing else is exposed.
export async function GET() {
  try {
    return NextResponse.json({ sections: await listActiveSections() });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
