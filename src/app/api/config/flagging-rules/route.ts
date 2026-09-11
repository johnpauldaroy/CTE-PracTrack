import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { flaggingRuleConfigSchema } from "@/lib/validation/config";
import { getFlaggingRuleConfig, updateFlaggingRuleConfig } from "@/lib/check-in-config";

export async function GET() {
  try {
    await requireSession();
    const config = await getFlaggingRuleConfig();
    return NextResponse.json({ config });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const input = flaggingRuleConfigSchema.parse(body);
    const config = await updateFlaggingRuleConfig(user, input);
    return NextResponse.json({ config });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
