import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { archiveAcademicYear } from "@/lib/services/academic-period-service";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const academicYear = await archiveAcademicYear(user, id);
    return NextResponse.json({ academicYear });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
