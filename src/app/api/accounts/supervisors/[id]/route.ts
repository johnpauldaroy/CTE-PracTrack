import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { editSupervisorSchema } from "@/lib/validation/account";
import { updateSupervisor, deleteSupervisor } from "@/lib/services/account-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const input = editSupervisorSchema.parse(body);
    const supervisor = await updateSupervisor(user, id, input);
    return NextResponse.json({ supervisor });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await deleteSupervisor(user, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
