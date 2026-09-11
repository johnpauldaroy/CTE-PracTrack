import { prisma } from "@/lib/prisma";

/** The single system-wide active shifting, or null if none is active yet. */
export async function getActiveShifting() {
  return prisma.shifting.findFirst({
    where: { status: "ACTIVE" },
    include: { semester: { include: { academicYear: true } } },
  });
}
