import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { assignSessionSchema } from "@/lib/validation/session";
import { assignSession, listSessions } from "@/lib/services/session-service";

export async function GET() {
  try { return NextResponse.json({ sessions: await listSessions(await requireSession()) }); }
  catch (error) { return toApiErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSession();
    return NextResponse.json({ session: await assignSession(actor, assignSessionSchema.parse(await request.json())) }, { status: 201 });
  } catch (error) { return toApiErrorResponse(error); }
}
