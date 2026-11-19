import { prisma } from "@/lib/prisma";

/**
 * The single "is this an expected duty day?" rule (CLAUDE.md: one shared helper,
 * never re-implemented per feature). A day is expected only if it falls on one of
 * the shifting's duty weekdays AND has no no-duty entry covering the intern.
 *
 * Dates here are UTC-midnight Dates that represent a Manila calendar day (the
 * @db.Date convention used everywhere), so `getUTCDay()` is the Manila weekday.
 */

export interface NonDutyRow {
  date: Date;
  schoolId: string | null;
  internId: string | null;
  reason: string;
}

export type DayKind = "EXPECTED" | "WEEKEND" | "NO_DUTY";

export interface DutyCalendar {
  dutyWeekdays: number[];
  /** What kind of day this is for the intern the calendar was built for. */
  kind(date: Date): DayKind;
  /** The no-duty reason when `kind(date) === "NO_DUTY"`, else null. */
  noDutyReason(date: Date): string | null;
  /** True when attendance is expected on this date. */
  isExpectedDay(date: Date): boolean;
}

export function buildDutyCalendar(
  shifting: { dutyWeekdays: number[] },
  rows: NonDutyRow[],
  who: { schoolId: string; internId: string },
): DutyCalendar {
  // An intern-specific entry wins over a school entry, which wins over "all schools".
  const rank = (row: NonDutyRow) => (row.internId ? 0 : row.schoolId ? 1 : 2);
  const byDate = new Map<number, NonDutyRow>();
  for (const row of rows) {
    const applies =
      (row.internId && row.internId === who.internId) ||
      (!row.internId && row.schoolId && row.schoolId === who.schoolId) ||
      (!row.internId && !row.schoolId);
    if (!applies) continue;
    const key = row.date.getTime();
    const current = byDate.get(key);
    if (!current || rank(row) < rank(current)) byDate.set(key, row);
  }

  const kind = (date: Date): DayKind => {
    if (byDate.has(date.getTime())) return "NO_DUTY";
    return shifting.dutyWeekdays.includes(date.getUTCDay()) ? "EXPECTED" : "WEEKEND";
  };

  return {
    dutyWeekdays: shifting.dutyWeekdays,
    kind,
    noDutyReason: (date) => byDate.get(date.getTime())?.reason ?? null,
    isExpectedDay: (date) => kind(date) === "EXPECTED",
  };
}

export async function loadNonDutyRows(shiftingId: string): Promise<NonDutyRow[]> {
  return prisma.nonDutyDay.findMany({
    where: { shiftingId },
    select: { date: true, schoolId: true, internId: true, reason: true },
  });
}

/** Calendar for one intern in one shifting (loads the shifting's no-duty rows). */
export async function getDutyCalendarForIntern(
  shifting: { id: string; dutyWeekdays: number[] },
  intern: { id: string; assignedSchoolId: string },
): Promise<DutyCalendar> {
  const rows = await loadNonDutyRows(shifting.id);
  return buildDutyCalendar(shifting, rows, { schoolId: intern.assignedSchoolId, internId: intern.id });
}
