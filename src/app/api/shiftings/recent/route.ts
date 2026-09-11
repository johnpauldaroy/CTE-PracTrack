import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

/** The active shifting plus the most recently completed ones, for shifting-tab switchers. */
export async function GET() {
  try {
    await requireSession();
    const shiftings = await prisma.shifting.findMany({
      orderBy: { startDate: "desc" },
      take: 4,
    });
    return NextResponse.json({ shiftings });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
