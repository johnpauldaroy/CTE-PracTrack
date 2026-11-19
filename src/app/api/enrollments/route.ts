import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { listPendingEnrollments } from "@/lib/services/enrollment-service";

export async function GET() {
  try {
    return NextResponse.json({ requests: await listPendingEnrollments(await requireSession()) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
