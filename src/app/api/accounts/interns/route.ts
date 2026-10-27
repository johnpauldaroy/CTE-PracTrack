import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { createIntern, listInterns } from "@/lib/services/account-service";
import { adminCreateInternSchema } from "@/lib/validation/account";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const schoolId = searchParams.get("schoolId") ?? undefined;
    const interns = await listInterns(user, { search, schoolId });
    return NextResponse.json({ interns });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const input = adminCreateInternSchema.parse(await request.json());
    const intern = await createIntern(user, input);
    return NextResponse.json({ intern }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
