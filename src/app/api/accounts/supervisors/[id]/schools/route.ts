import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { setSupervisorSchoolsSchema } from "@/lib/validation/account";
import { setSupervisorSchools } from "@/lib/services/account-service";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    const { id } = await params;
    const input = setSupervisorSchoolsSchema.parse(await request.json());
    const result = await setSupervisorSchools(actor, id, input.schoolIds);
    return NextResponse.json(result);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
