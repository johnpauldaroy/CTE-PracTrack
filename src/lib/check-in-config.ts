import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { ForbiddenError } from "@/lib/session";
import type { SessionUser } from "@/lib/auth";
import type { FlaggingRuleConfigInput, CheckInConfigInput } from "@/lib/validation/config";
import type { Prisma } from "@/generated/prisma/client";

export const CHECK_IN_FIELDS = [
  "amTimeInCutoff",
  "amTimeOutStart",
  "pmTimeInCutoff",
  "pmTimeOutStart",
  "pmWindowOpensAt",
] as const;
export type CheckInField = (typeof CHECK_IN_FIELDS)[number];

export type EffectiveCheckInConfig = Record<CheckInField, string> & {
  // "HH:mm" Asia/Manila. Where each value came from, per field.
  sources: Record<CheckInField, "SCHOOL" | "GLOBAL">;
};

/**
 * The single cascade resolver (CLAUDE.md: "Resolve the effective value in
 * one shared helper; don't re-implement the fallback per feature"). A
 * school's own values override the singleton CheckInConfig field-by-field;
 * each of the five can be overridden independently.
 *
 *  - amTimeInCutoff / pmTimeInCutoff: time-in after this is Late for that half
 *  - amTimeOutStart / pmTimeOutStart: earliest time-out for that half
 *  - pmWindowOpensAt: a time-in at or after this belongs to the PM half
 */
export async function resolveEffectiveCheckInConfig(
  schoolId: string,
): Promise<EffectiveCheckInConfig> {
  const [school, global] = await Promise.all([
    prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      select: {
        amTimeInCutoff: true,
        amTimeOutStart: true,
        pmTimeInCutoff: true,
        pmTimeOutStart: true,
        pmWindowOpensAt: true,
      },
    }),
    getGlobalCheckInConfig(),
  ]);

  const values = {} as Record<CheckInField, string>;
  const sources = {} as Record<CheckInField, "SCHOOL" | "GLOBAL">;
  for (const field of CHECK_IN_FIELDS) {
    values[field] = school[field] ?? global[field];
    sources[field] = school[field] ? "SCHOOL" : "GLOBAL";
  }
  return { ...values, sources };
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

  const config = await prisma.$transaction(async (tx) => {
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
          after: {
            absenceEarlyWarning: updated.absenceEarlyWarning,
            consecutiveAbsences: updated.consecutiveAbsences,
            dropEligibleAbove: updated.dropEligibleAbove,
            evaluationPendingDays: updated.evaluationPendingDays,
            behindPaceTolerance: updated.behindPaceTolerance.toString(),
          },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return updated;
  });

  // New thresholds apply from now on: re-run the rules so dashboards reflect them immediately.
  // Imported lazily to avoid a module cycle (alert-service reads this module's config getter).
  const { evaluateAllAlerts } = await import("@/lib/services/alert-service");
  try {
    await evaluateAllAlerts();
  } catch (error) {
    console.error("[alerts] evaluation after flagging-rule change failed", error);
  }
  return config;
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
          before: Object.fromEntries(CHECK_IN_FIELDS.map((field) => [field, before[field]])),
          after: input,
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );

    return updated;
  });
}
