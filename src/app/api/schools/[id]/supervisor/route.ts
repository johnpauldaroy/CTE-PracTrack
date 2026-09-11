import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { assignSupervisorSchema } from "@/lib/validation/school";
import { assignSupervisor } from "@/lib/services/school-service";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const input = assignSupervisorSchema.parse(body);
    const school = await assignSupervisor(user, id, input.supervisorUserId);
    return NextResponse.json({ school });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
