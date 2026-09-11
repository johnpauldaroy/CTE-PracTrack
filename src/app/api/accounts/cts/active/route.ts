import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { listActiveCts } from "@/lib/services/ct-approval-service";

export async function GET() {
  try {
    const user = await requireSession();
    const cts = await listActiveCts(user);
    return NextResponse.json({ cts });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
