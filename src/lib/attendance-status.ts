import type { AttendanceStatus } from "@/generated/prisma/client";
import { isAtOrAfterManilaCutoff, todayManilaDateOnly } from "@/lib/timezone";

export interface AttendanceStatusInputs {
  dateOnly: Date;
  timeIn: Date | null;
  timeOut: Date | null;
  excusedAt: Date | null;
  timeInCutoff: string; // "HH:mm" effective (school override -> global)
}

/**
 * The single status-derivation function (CLAUDE.md: "Attendance status is
 * computed, never stored as free input"). Called both when writing a punch
 * (to snapshot the status at that moment) and whenever a record is read, so
 * a day that has gone stale — e.g. a time-in with no time-out, now that the
 * day has ended — always reads correctly without a cron job rewriting rows.
 *
 * EXCUSED always wins: it's the one status a supervisor sets explicitly and
 * it overrides whatever the raw punch data would otherwise derive to.
 */
export function deriveAttendanceStatus(input: AttendanceStatusInputs): AttendanceStatus {
  if (input.excusedAt) return "EXCUSED";

  if (!input.timeIn) return "ABSENT";

  if (!input.timeOut) {
    // Still today (Manila) and before end of day -> the day isn't over yet,
    // but there is no "IN_PROGRESS" status in the schema, so a time-in with
    // no time-out reads as INCOMPLETE at any point after it's recorded, per
    // PRD §6.5 ("A day with a time-in and no time-out is INCOMPLETE").
    return "INCOMPLETE";
  }

  const isLate = isAtOrAfterManilaCutoff(input.timeIn, input.dateOnly, input.timeInCutoff);
  return isLate ? "LATE" : "PRESENT";
}

/** True if `dateOnly` (a UTC-midnight Date representing a Manila calendar day) is today in Manila. */
export function isToday(dateOnly: Date): boolean {
  return dateOnly.getTime() === todayManilaDateOnly().getTime();
}
