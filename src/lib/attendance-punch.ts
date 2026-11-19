import { isAtOrAfterManilaCutoff } from "@/lib/timezone";
import type { AttendancePeriod, DayPunches } from "@/lib/attendance-status";

/**
 * Which half-day a punch belongs to is decided here, on the server, from the
 * day's existing punches and the clock — the client never sends a period
 * (same rule as the geofence: nothing trust-sensitive comes from the device).
 */
export interface PunchTimingConfig {
  amTimeOutStart: string;
  pmTimeOutStart: string;
  pmWindowOpensAt: string;
}

/** A Time In at or after `pmWindowOpensAt` is the PM time-in; before it, the AM one. */
export function planTimeIn(punches: DayPunches, now: Date, today: Date, config: PunchTimingConfig): AttendancePeriod {
  const period: AttendancePeriod = isAtOrAfterManilaCutoff(now, today, config.pmWindowOpensAt) ? "PM" : "AM";
  const side = period === "AM" ? punches.am : punches.pm;
  if (side.timeIn) throw new Error(`You have already timed in for the ${period} today.`);
  return period;
}

/** A Time Out closes the open half-day (PM first, then AM) once that half's time-out start has passed. */
export function planTimeOut(punches: DayPunches, now: Date, today: Date, config: PunchTimingConfig): AttendancePeriod {
  const target: AttendancePeriod | null =
    punches.pm.timeIn && !punches.pm.timeOut ? "PM" : punches.am.timeIn && !punches.am.timeOut ? "AM" : null;
  if (!target) {
    const anyOut = punches.am.timeOut || punches.pm.timeOut;
    throw new Error(anyOut ? "You have no open Time In to time out from." : "You must time in before you can time out.");
  }
  const start = target === "PM" ? config.pmTimeOutStart : config.amTimeOutStart;
  if (!isAtOrAfterManilaCutoff(now, today, start)) {
    throw new Error(`${target} Time Out is available after ${start}.`);
  }
  return target;
}

export interface PunchAction {
  enabled: boolean;
  period: AttendancePeriod | null;
  /** Why the action is unavailable (shown to the intern). */
  reason: string | null;
}

/** What the intern's punch card may offer right now. The server re-checks on every punch. */
export function describePunchActions(punches: DayPunches, now: Date, today: Date, config: PunchTimingConfig) {
  const attempt = (plan: () => AttendancePeriod): PunchAction => {
    try {
      return { enabled: true, period: plan(), reason: null };
    } catch (error) {
      return { enabled: false, period: null, reason: error instanceof Error ? error.message : "Unavailable" };
    }
  };
  return {
    timeIn: attempt(() => planTimeIn(punches, now, today, config)),
    timeOut: attempt(() => planTimeOut(punches, now, today, config)),
  };
}
