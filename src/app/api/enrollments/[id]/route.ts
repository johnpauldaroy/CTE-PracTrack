import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { rejectEnrollmentSchema } from "@/lib/validation/intern-registration";
import { approveEnrollment, rejectEnrollment } from "@/lib/services/enrollment-service";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: rejectEnrollmentSchema.shape.reason }),
]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    const { id } = await params;
    const input = bodySchema.parse(await request.json());
    if (input.action === "approve") await approveEnrollment(actor, id);
    else await rejectEnrollment(actor, id, input.reason);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
