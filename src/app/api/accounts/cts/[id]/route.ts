import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { deleteCt, getCtDetail } from "@/lib/services/ct-approval-service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const ct = await getCtDetail(user, id);
    return NextResponse.json({ ct });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await deleteCt(user, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
