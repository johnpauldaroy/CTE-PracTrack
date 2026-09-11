import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { createSemesterSchema } from "@/lib/validation/shifting";
import { listActiveAcademicYears, createSemester } from "@/lib/services/academic-period-service";

export async function GET() {
  try {
    await requireSession();
    const academicYears = await listActiveAcademicYears();
    return NextResponse.json({ academicYears });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const input = createSemesterSchema.parse(body);
    const result = await createSemester(user, input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
