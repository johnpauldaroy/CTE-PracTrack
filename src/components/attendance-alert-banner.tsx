import { cn } from "@/lib/utils";

export type AttendanceLevel = "NONE" | "EARLY_WARNING" | "DROP_ELIGIBLE";

/**
 * One banner for every DTR view (intern, supervisor, admin drawer). The level
 * comes from the server (FlaggingRuleConfig), so the wording always matches the
 * configured thresholds and the highest rule the intern meets.
 */
export function AttendanceAlertBanner({
  level,
  absences,
  earlyWarning,
  dropLimit,
  audience,
}: {
  level: AttendanceLevel;
  absences: number;
  earlyWarning: number;
  dropLimit: number;
  audience: "intern" | "staff";
}) {
  if (level === "NONE") return null;

  const dropEligible = level === "DROP_ELIGIBLE";
  const text =
    audience === "intern"
      ? dropEligible
        ? `${absences} absences recorded. This is above the drop limit of ${dropLimit} days. Please see your supervisor right away.`
        : `${absences} absences recorded. Early warning threshold is ${earlyWarning}. Please speak with your supervisor.`
      : dropEligible
        ? `${absences} absences. Above the drop limit of ${dropLimit} days: drop-eligible.`
        : `${absences} absences. Early warning exceeded. Drop limit is ${dropLimit} days.`;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg px-3 py-2 text-sm",
        dropEligible ? "bg-destructive/10 font-medium text-destructive" : "bg-accent text-accent-foreground",
      )}
    >
      {text}
    </div>
  );
}
