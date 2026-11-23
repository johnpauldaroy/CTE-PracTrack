import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { getPairingBoard } from "@/lib/services/ct-assignment-service";

export async function GET() {
  try {
    return NextResponse.json(await getPairingBoard(await requireSession()));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
