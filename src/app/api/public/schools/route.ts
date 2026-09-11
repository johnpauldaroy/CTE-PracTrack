import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toApiErrorResponse } from "@/lib/api-error";

// Unauthenticated by design: the CT self-registration form (PRD §6.1) needs
// a school picker before the registrant has an account. Only non-sensitive
// fields are exposed — no coordinates, no counts, no supervisor names.
export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ schools });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
