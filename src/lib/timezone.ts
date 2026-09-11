import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

// All timestamps are stored in UTC (see CLAUDE.md). Every day-boundary, cut-off
// comparison, or "today" calculation must go through this module rather than
// comparing server-local or raw UTC dates directly.

export const MANILA_TZ = "Asia/Manila";

/** The current instant, expressed as a Date whose fields read as Manila wall-clock time. */
export function nowInManila(): Date {
  return toZonedTime(new Date(), MANILA_TZ);
}

/** Today's calendar date in Manila, as a UTC-midnight Date (for @db.Date columns). */
export function todayManilaDateOnly(): Date {
  const manilaNow = nowInManila();
  const y = manilaNow.getFullYear();
  const m = manilaNow.getMonth();
  const d = manilaNow.getDate();
  return new Date(Date.UTC(y, m, d));
}

/** Converts a UTC instant to the Manila calendar date (UTC-midnight Date) it falls on. */
export function toManilaDateOnly(utcInstant: Date): Date {
  const manila = toZonedTime(utcInstant, MANILA_TZ);
  return new Date(Date.UTC(manila.getFullYear(), manila.getMonth(), manila.getDate()));
}

/**
 * Combines a Manila calendar date with an "HH:mm" wall-clock time into the
 * corresponding UTC instant. Used to compare a punch timestamp against a
 * configured cut-off (e.g. "07:30") on the same Manila day.
 */
export function manilaTimeOnDateToUtc(dateOnly: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const y = dateOnly.getUTCFullYear();
  const m = dateOnly.getUTCMonth();
  const d = dateOnly.getUTCDate();
  // Build the wall-clock string directly and let fromZonedTime interpret it in Manila.
  const zonedLocal = new Date(y, m, d, hours, minutes, 0, 0);
  return fromZonedTime(zonedLocal, MANILA_TZ);
}

/** Formats a UTC instant for display in Asia/Manila. */
export function formatManila(utcInstant: Date, fmt: string): string {
  return formatInTimeZone(utcInstant, MANILA_TZ, fmt);
}

/** True if `utcInstant` is on or after the Manila cut-off time on `dateOnly`. */
export function isAtOrAfterManilaCutoff(utcInstant: Date, dateOnly: Date, hhmm: string): boolean {
  return utcInstant.getTime() >= manilaTimeOnDateToUtc(dateOnly, hhmm).getTime();
}
