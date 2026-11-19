import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { approveSupervisorSchema } from "@/lib/validation/account";
import { approveSupervisor } from "@/lib/services/account-service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireSession();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const input = approveSupervisorSchema.parse(body);
    const supervisor = await approveSupervisor(actor, id, input.schoolIds);
    return NextResponse.json({ supervisor });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
