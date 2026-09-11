import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { checkInConfigSchema } from "@/lib/validation/config";
import { getGlobalCheckInConfig, updateGlobalCheckInConfig } from "@/lib/check-in-config";

export async function GET() {
  try {
    await requireSession();
    const config = await getGlobalCheckInConfig();
    return NextResponse.json({ config });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const input = checkInConfigSchema.parse(body);
    const config = await updateGlobalCheckInConfig(user, input);
    return NextResponse.json({ config });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
