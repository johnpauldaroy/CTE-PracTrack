import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { FieldValidationError, ForbiddenError } from "@/lib/session";
import { sectionLabel } from "@/lib/section-label";
import type { SessionUser } from "@/lib/auth";
import type { SectionInput } from "@/lib/validation/intern-registration";
import type { Prisma } from "@/generated/prisma/client";

function requireAdmin(actor: SessionUser) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only the CTE office can manage sections.");
}

/** Public dropdown for the registration form: active sections only, nothing else. */
export async function listActiveSections() {
  return prisma.section.findMany({
    where: { isActive: true },
    select: { id: true, name: true, course: true, yearLevel: true },
    orderBy: [{ course: "asc" }, { yearLevel: "asc" }, { name: "asc" }],
  });
}

export async function listSections(actor: SessionUser) {
  requireAdmin(actor);
  return prisma.section.findMany({
    include: { _count: { select: { interns: true } } },
    orderBy: [{ course: "asc" }, { yearLevel: "asc" }, { name: "asc" }],
  });
}

export async function createSection(actor: SessionUser, input: SectionInput) {
  requireAdmin(actor);
  // The same letter may exist in other courses and year levels; only the full combination must be unique.
  if (await prisma.section.findFirst({ where: { course: input.course, yearLevel: input.yearLevel, name: input.name } })) {
    throw new FieldValidationError({ name: [`${sectionLabel(input)} already exists.`] });
  }
  return prisma.$transaction(async (tx) => {
    const section = await tx.section.create({
      data: { name: input.name, course: input.course, yearLevel: input.yearLevel, isActive: input.isActive ?? true },
    });
    await writeAuditLog(
      { actor, action: "SECTION_CREATE", entityType: "Section", entityId: section.id, diff: { after: input } as unknown as Prisma.InputJsonValue },
      tx,
    );
    return section;
  });
}

/** Rename, change course/year, or deactivate. Sections are never deleted: interns keep pointing at them. */
export async function updateSection(actor: SessionUser, id: string, input: SectionInput) {
  requireAdmin(actor);
  const clash = await prisma.section.findFirst({
    where: { course: input.course, yearLevel: input.yearLevel, name: input.name, NOT: { id } },
  });
  if (clash) throw new FieldValidationError({ name: [`${sectionLabel(input)} already exists.`] });
  return prisma.$transaction(async (tx) => {
    const before = await tx.section.findUniqueOrThrow({ where: { id } });
    const section = await tx.section.update({
      where: { id },
      data: { name: input.name, course: input.course, yearLevel: input.yearLevel, isActive: input.isActive ?? before.isActive },
    });
    await writeAuditLog(
      {
        actor,
        action: "SECTION_UPDATE",
        entityType: "Section",
        entityId: id,
        diff: {
          before: { name: before.name, course: before.course, yearLevel: before.yearLevel, isActive: before.isActive },
          after: { name: section.name, course: section.course, yearLevel: section.yearLevel, isActive: section.isActive },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );
    return section;
  });
}
