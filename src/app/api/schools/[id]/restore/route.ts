import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { restoreSchool } from "@/lib/services/school-service";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const school = await restoreSchool(user, id);
    return NextResponse.json({ school });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
