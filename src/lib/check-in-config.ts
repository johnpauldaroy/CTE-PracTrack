import { prisma } from "@/lib/prisma";

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
