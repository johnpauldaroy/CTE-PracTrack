import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { getEvaluationInstrument } from "@/lib/services/session-service";

export async function GET() {
  try { return NextResponse.json({ criteria: await getEvaluationInstrument(await requireSession()) }); }
  catch (error) { return toApiErrorResponse(error); }
}
