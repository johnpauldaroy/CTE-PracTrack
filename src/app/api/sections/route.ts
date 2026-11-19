import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { sectionSchema } from "@/lib/validation/intern-registration";
import { createSection, listSections } from "@/lib/services/section-service";

export async function GET() {
  try {
    return NextResponse.json({ sections: await listSections(await requireSession()) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSession();
    const section = await createSection(actor, sectionSchema.parse(await request.json()));
    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
