import type { AttendanceStatus } from "@/generated/prisma/client";
import { isAtOrAfterManilaCutoff, todayManilaDateOnly } from "@/lib/timezone";

export type AttendancePeriod = "AM" | "PM";

export interface PeriodPunches {
  timeIn: Date | null;
  timeOut: Date | null;
}

export interface DayPunches {
  am: PeriodPunches;
  pm: PeriodPunches;
}

/** The punch columns of an AttendanceRecord row (or anything shaped like one). */
export interface PunchRecordShape {
  amTimeIn: Date | null;
  amTimeOut: Date | null;
  pmTimeIn: Date | null;
  pmTimeOut: Date | null;
}

export function punchesOf(record: PunchRecordShape | null | undefined): DayPunches {
  return {
    am: { timeIn: record?.amTimeIn ?? null, timeOut: record?.amTimeOut ?? null },
    pm: { timeIn: record?.pmTimeIn ?? null, timeOut: record?.pmTimeOut ?? null },
  };
}

/** Effective cut-offs for the two time-in checks (school override -> global). */
export interface TimeInCutoffs {
  amTimeInCutoff: string; // "HH:mm" Asia/Manila
  pmTimeInCutoff: string; // "HH:mm" Asia/Manila
}

export interface AttendanceStatusInputs {
  dateOnly: Date;
  punches: DayPunches;
  excusedAt: Date | null;
  cutoffs: TimeInCutoffs;
}

/** One half-day's state, derived from its punches. */
export type PeriodState = "NONE" | "OPEN" | "ON_TIME" | "LATE";

export function derivePeriodState(
  punches: PeriodPunches,
  dateOnly: Date,
  timeInCutoff: string,
): PeriodState {
  if (!punches.timeIn) return "NONE";
  if (!punches.timeOut) return "OPEN";
  return isAtOrAfterManilaCutoff(punches.timeIn, dateOnly, timeInCutoff) ? "LATE" : "ON_TIME";
}

/**
 * The single status-derivation function (CLAUDE.md: "Attendance status is
 * computed, never stored as free input"). Called when writing a punch (to
 * snapshot the status) and wherever a day must be re-derived.
 *
 * Day rule, built from the two half-days:
 *  - EXCUSED always wins (the one status a supervisor sets explicitly).
 *  - No punch in either half            -> ABSENT
 *  - A half still open, or one half missed entirely -> INCOMPLETE
 *    (a single missed half is not a whole-day absence, so the thresholds,
 *    which count days, stay whole numbers)
 *  - Both halves complete, either time-in after its cut-off -> LATE
 *  - Otherwise                          -> PRESENT
 *
 * NO_DUTY is never derived here: it comes from the duty calendar for days
 * that have no punch at all (see attendance-calendar.ts / dtr-service.ts).
 */
export function deriveAttendanceStatus(input: AttendanceStatusInputs): AttendanceStatus {
  if (input.excusedAt) return "EXCUSED";

  const am = derivePeriodState(input.punches.am, input.dateOnly, input.cutoffs.amTimeInCutoff);
  const pm = derivePeriodState(input.punches.pm, input.dateOnly, input.cutoffs.pmTimeInCutoff);

  if (am === "NONE" && pm === "NONE") return "ABSENT";
  if (am === "OPEN" || pm === "OPEN" || am === "NONE" || pm === "NONE") return "INCOMPLETE";
  return am === "LATE" || pm === "LATE" ? "LATE" : "PRESENT";
}

/** True if `dateOnly` (a UTC-midnight Date representing a Manila calendar day) is today in Manila. */
export function isToday(dateOnly: Date): boolean {
  return dateOnly.getTime() === todayManilaDateOnly().getTime();
}
