import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { activateShifting } from "@/lib/services/academic-period-service";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const shifting = await activateShifting(user, id);
    return NextResponse.json({ shifting });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
