import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/session";

/** Shiftings within the intern's own semester history, for the shifting-tab switcher. */
export async function GET() {
  try {
    const user = await requireSession();
    if (user.role !== "STUDENT_INTERN" || !user.internProfileId) {
      throw new ForbiddenError("Only a student intern can view this.");
    }

    const shiftings = await prisma.shifting.findMany({
      where: { attendanceRecords: { some: { internId: user.internProfileId } } },
      orderBy: { startDate: "desc" },
    });

    // Always include the active shifting even if the intern has no records
    // in it yet (e.g. day one, before any punch).
    const activeShifting = await prisma.shifting.findFirst({ where: { status: "ACTIVE" } });
    const merged = activeShifting && !shiftings.some((s) => s.id === activeShifting.id)
      ? [activeShifting, ...shiftings]
      : shiftings;

    return NextResponse.json({ shiftings: merged });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
