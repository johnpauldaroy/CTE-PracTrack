import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { sectionSchema } from "@/lib/validation/intern-registration";
import { updateSection } from "@/lib/services/section-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    const { id } = await params;
    const section = await updateSection(actor, id, sectionSchema.parse(await request.json()));
    return NextResponse.json({ section });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
