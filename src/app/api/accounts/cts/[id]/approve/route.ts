import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { approveCt } from "@/lib/services/ct-approval-service";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const ct = await approveCt(user, id);
    return NextResponse.json({ ct });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
