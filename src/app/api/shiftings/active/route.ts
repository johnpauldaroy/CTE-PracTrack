import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { getActiveShifting } from "@/lib/services/shifting-service";

export async function GET() {
  try {
    await requireSession();
    const shifting = await getActiveShifting();
    return NextResponse.json({ shifting });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
