import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { createSupervisorSchema } from "@/lib/validation/account";
import { listSupervisors, createSupervisor } from "@/lib/services/account-service";

/** GET lists active supervisors; GET ?status=pending lists self-registrations awaiting approval. */
export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const pending = request.nextUrl.searchParams.get("status") === "pending";
    const supervisors = await listSupervisors(user, { pending });
    return NextResponse.json({ supervisors });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const body = await request.json();
    const input = createSupervisorSchema.parse(body);
    const supervisor = await createSupervisor(user, input);
    return NextResponse.json({ supervisor }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
