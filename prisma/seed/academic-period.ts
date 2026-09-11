import { prisma } from "@/lib/prisma";

/**
 * Seeds one academic year with two semesters, each with First/Second
 * Shifting, and activates the current one so the app has a non-empty
 * "active shifting" to render against out of the box (PRD §5).
 */
export async function seedAcademicPeriod() {
  const year = await prisma.academicYear.upsert({
    where: { label: "2026-2027" },
    update: {},
    create: { label: "2026-2027", isArchived: false },
  });

  const semester = await prisma.semester.upsert({
    where: { id: "seed-2026-2027-sem1" },
    update: {},
    create: {
      id: "seed-2026-2027-sem1",
      academicYearId: year.id,
      name: "First Semester",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-12-19"),
    },
  });

  const firstShifting = await prisma.shifting.upsert({
    where: { semesterId_name: { semesterId: semester.id, name: "FIRST" } },
    update: {},
    create: {
      semesterId: semester.id,
      name: "FIRST",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-09-30"),
      requiredTeachingSessions: 15,
      requiredFinalDemos: 1,
      status: "COMPLETED",
      activatedAt: new Date("2026-08-01"),
      completedAt: new Date("2026-09-30"),
    },
  });

  const secondShifting = await prisma.shifting.upsert({
    where: { semesterId_name: { semesterId: semester.id, name: "SECOND" } },
    update: {},
    create: {
      semesterId: semester.id,
      name: "SECOND",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-12-19"),
      requiredTeachingSessions: 15,
      requiredFinalDemos: 1,
      status: "ACTIVE",
      activatedAt: new Date("2026-10-01"),
    },
  });

  console.log("[seed] Academic period: 2026-2027 First Semester, Second Shifting active.");
  return { year, semester, firstShifting, secondShifting };
}
