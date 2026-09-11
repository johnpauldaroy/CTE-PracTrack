import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { listArchivedAcademicYears } from "@/lib/services/academic-period-service";

export async function GET() {
  try {
    await requireSession();
    const academicYears = await listArchivedAcademicYears();
    return NextResponse.json({ academicYears });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
