import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";

/** Admin-only: all active supervisors, for the "Change Supervisor" picker. */
export async function GET() {
  try {
    await requireRole("ADMIN");
    const supervisors = await prisma.user.findMany({
      where: { role: "SUPERVISOR", status: "ACTIVE", deletedAt: null },
      include: { supervisorProfile: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ supervisors });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
