import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ForbiddenError } from "@/lib/session";
import type { SessionUser } from "@/lib/auth";
import type { FlaggingRuleConfigInput, CheckInConfigInput } from "@/lib/validation/config";
import type { Prisma } from "@/generated/prisma/client";

export interface EffectiveCheckInConfig {
  timeInCutoff: string; // "HH:mm" Asia/Manila
  timeOutStart: string; // "HH:mm" Asia/Manila
  timeInSource: "SCHOOL" | "GLOBAL";
  timeOutSource: "SCHOOL" | "GLOBAL";
}

/**
 * The single cascade resolver (CLAUDE.md: "Resolve the effective value in
 * one shared helper; don't re-implement the fallback per feature"). A
 * school's own timeInCutoff/timeOutStart override the singleton
 * CheckInConfig field-by-field; either can be overridden independently.
 */
export async function resolveEffectiveCheckInConfig(
  schoolId: string,
): Promise<EffectiveCheckInConfig> {
  const [school, global] = await Promise.all([
    prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      select: { timeInCutoff: true, timeOutStart: true },
    }),
    getGlobalCheckInConfig(),
  ]);

  return {
    timeInCutoff: school.timeInCutoff ?? global.timeInCutoff,
    timeOutStart: school.timeOutStart ?? global.timeOutStart,
    timeInSource: school.timeInCutoff ? "SCHOOL" : "GLOBAL",
    timeOutSource: school.timeOutStart ? "SCHOOL" : "GLOBAL",
  };
}

/** The singleton CheckInConfig row, created with defaults on first read if missing. */
export async function getGlobalCheckInConfig() {
  const existing = await prisma.checkInConfig.findFirst();
  if (existing) return existing;
  return prisma.checkInConfig.create({ data: {} });
}

/** The singleton FlaggingRuleConfig row, created with defaults on first read if missing. */
export async function getFlaggingRuleConfig() {
  const existing = await prisma.flaggingRuleConfig.findFirst();
  if (existing) return existing;
  return prisma.flaggingRuleConfig.create({ data: {} });
}

// Config changes are audit-logged with before/after and take effect
// prospectively — they never retroactively rewrite recorded statuses
// (CLAUDE.md, PRD §6.11).

export async function updateFlaggingRuleConfig(actor: SessionUser, input: FlaggingRuleConfigInput) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only the CTE office can change flagging rules.");

  return prisma.$transaction(async (tx) => {
    const before = await getFlaggingRuleConfig();
    const updated = await tx.flaggingRuleConfig.update({ where: { id: before.id }, data: input });

    await writeAuditLog(
      {
        actor,
        action: "FLAGGING_RULES_UPDATE",
        entityType: "FlaggingRuleConfig",
        entityId: updated.id,
        diff: {
          before: {
            absenceEarlyWarning: before.absenceEarlyWarning,
            consecutiveAbsences: before.consecutiveAbsences,
            dropEligibleAbove: before.dropEligibleAbove,
            evaluationPendingDays: before.evaluationPendingDays,
            behindPaceTolerance: before.behindPaceTolerance.toString(),
          },
          after: input,
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return updated;
  });
}

export async function updateGlobalCheckInConfig(actor: SessionUser, input: CheckInConfigInput) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only the CTE office can change check-in settings.");

  return prisma.$transaction(async (tx) => {
    const before = await getGlobalCheckInConfig();
    const updated = await tx.checkInConfig.update({ where: { id: before.id }, data: input });

    await writeAuditLog(
      {
        actor,
        action: "CHECKIN_CONFIG_UPDATE",
        entityType: "CheckInConfig",
        entityId: updated.id,
        diff: {
          before: { timeInCutoff: before.timeInCutoff, timeOutStart: before.timeOutStart },
          after: input,
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return updated;
  });
}
