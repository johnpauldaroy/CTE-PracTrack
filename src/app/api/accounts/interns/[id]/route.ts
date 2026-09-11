import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { editInternAccountSchema } from "@/lib/validation/account";
import { getInternDetail, updateInternAccount, deleteInternAccount } from "@/lib/services/account-service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const intern = await getInternDetail(user, id);
    return NextResponse.json({ intern });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const input = editInternAccountSchema.parse(body);
    const intern = await updateInternAccount(user, id, input);
    return NextResponse.json({ intern });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await deleteInternAccount(user, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
