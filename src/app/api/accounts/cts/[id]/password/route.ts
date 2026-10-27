import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { setPasswordSchema } from "@/lib/validation/account";
import { setCtPassword } from "@/lib/services/ct-approval-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const { password } = setPasswordSchema.parse(await request.json());
    await setCtPassword(user, id, password);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
