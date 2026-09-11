import { prisma } from "@/lib/prisma";

/**
 * Seeds the two config singletons with the mockup-confirmed defaults (PRD
 * §6.11 / UI_FLOW_SPEC.md §2.12). These are starting values in a config row,
 * editable from Settings — never constants baked into code.
 */
export async function seedConfigSingletons() {
  const existingFlagging = await prisma.flaggingRuleConfig.findFirst();
  if (!existingFlagging) {
    await prisma.flaggingRuleConfig.create({
      data: {
        absenceEarlyWarning: 3,
        consecutiveAbsences: 3,
        dropEligibleAbove: 12,
        evaluationPendingDays: 7,
        behindPaceTolerance: 0,
      },
    });
    console.log("[seed] FlaggingRuleConfig created with mockup defaults.");
  }

  const existingCheckIn = await prisma.checkInConfig.findFirst();
  if (!existingCheckIn) {
    // PRD §10 Q1 is explicitly open on what governs Time Out (clock time vs
    // minimum-hours-rendered). Seeding the drafted-default shape — a
    // configurable clock time — with a placeholder 07:30/15:00 pair rather
    // than the mockup's self-contradictory 07:30/07:30 (see UI_FLOW_SPEC.md
    // §7 item 2, which flags that value as a copy-paste artifact).
    await prisma.checkInConfig.create({
      data: { timeInCutoff: "07:30", timeOutStart: "15:00" },
    });
    console.log(
      "[seed] CheckInConfig created with placeholder defaults (07:30 / 15:00) — PRD §10 Q1 still open, confirm before relying on these values.",
    );
  }
}
