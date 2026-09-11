import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { changePasswordSchema } from "@/lib/validation/config";
import { changeOwnPassword } from "@/lib/services/account-security-service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const input = changePasswordSchema.parse(body);
    await changeOwnPassword(user, input);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
