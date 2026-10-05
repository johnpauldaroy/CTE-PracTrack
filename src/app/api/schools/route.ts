import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { createSchoolSchema } from "@/lib/validation/school";
import { listSchools, createSchool, listDeletedSchools } from "@/lib/services/school-service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const schools =
      request.nextUrl.searchParams.get("deleted") === "1" ? await listDeletedSchools(user) : await listSchools(user);
    return NextResponse.json({ schools });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const input = createSchoolSchema.parse(body);
    const school = await createSchool(user, input);
    return NextResponse.json({ school }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
