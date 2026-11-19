import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { reviewLessonPlanSchema } from "@/lib/validation/session";
import { reviewLessonPlan } from "@/lib/services/session-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    const { id } = await params;
    const input = reviewLessonPlanSchema.parse(await request.json());
    const session = await reviewLessonPlan(actor, id, input);
    return NextResponse.json({ session });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
