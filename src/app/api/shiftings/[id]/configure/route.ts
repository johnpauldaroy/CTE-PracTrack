import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { configureShiftingSchema } from "@/lib/validation/shifting";
import { configureShifting } from "@/lib/services/academic-period-service";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const input = configureShiftingSchema.parse(body);
    const shifting = await configureShifting(user, id, input);
    return NextResponse.json({ shifting });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
