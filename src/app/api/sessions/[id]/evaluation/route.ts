import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { submitEvaluationSchema } from "@/lib/validation/session";
import { submitEvaluation } from "@/lib/services/session-service";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const evaluation = await submitEvaluation(await requireSession(), id, submitEvaluationSchema.parse(await request.json()));
    return NextResponse.json({ evaluation }, { status: 201 });
  } catch (error) { return toApiErrorResponse(error); }
}
