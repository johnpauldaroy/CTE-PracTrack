import { prisma } from "@/lib/prisma";
import { scopeToRole } from "@/lib/scope";
import { getFlaggingRuleConfig } from "@/lib/check-in-config";
import { getDutyCalendarForIntern, type DutyCalendar } from "@/lib/attendance-calendar";
import { formatManila, todayManilaDateOnly } from "@/lib/timezone";
import type { SessionUser } from "@/lib/auth";
import type { AttendanceRecord, AttendanceStatus, Shifting } from "@/generated/prisma/client";

export interface DtrSummary {
  present: number;
  absent: number;
  incomplete: number;
  late: number;
  excused: number;
  noDuty: number;
}

export interface DtrRow {
  id: string;
  date: string; // yyyy-MM-dd (Manila)
  day: string; // e.g. "Wed"
  amIn: string | null;
  amOut: string | null;
  pmIn: string | null;
  pmOut: string | null;
  status: string;
  excuseReason: string | null;
  noDutyReason: string | null;
}

/** The highest attendance rule an intern currently meets (thresholds come from FlaggingRuleConfig). */
export type AttendanceLevel = "NONE" | "EARLY_WARNING" | "DROP_ELIGIBLE";

/**
 * Full DTR (all rows + summary counts) for one intern in one shifting. Used
 * by the intern's own Attendance screen and the supervisor/admin intern
 * detail DTR tab — one query shape shared by every caller.
 */
export async function getDtr(user: SessionUser, internId: string, shiftingId: string) {
  // scopeToRole.attendance already restricts by role; additionally verify
  // the specific intern is in scope by checking the intern row itself.
  const intern = await prisma.internProfile.findFirstOrThrow({
    where: { id: internId, ...scopeToRole.intern(user) },
    include: { assignedSchool: { select: { id: true, name: true } } },
  });
  const shifting = await prisma.shifting.findUniqueOrThrow({ where: { id: shiftingId } });

  const [records, calendar] = await Promise.all([
    prisma.attendanceRecord.findMany({ where: { internId: intern.id, shiftingId }, orderBy: { date: "desc" } }),
    getDutyCalendarForIntern(shifting, intern),
  ]);

  const allRecords = materializeAttendanceRecords(records, shifting, calendar);

  const summary: DtrSummary = { present: 0, absent: 0, incomplete: 0, late: 0, excused: 0, noDuty: 0 };
  const rows: DtrRow[] = allRecords.map((r) => {
    switch (r.status) {
      case "PRESENT":
        summary.present++;
        break;
      case "ABSENT":
        summary.absent++;
        break;
      case "INCOMPLETE":
        summary.incomplete++;
        break;
      case "LATE":
        summary.late++;
        break;
      case "EXCUSED":
        summary.excused++;
        break;
      case "NO_DUTY":
        summary.noDuty++;
        break;
    }
    const time = (value: Date | null) => (value ? formatManila(value, "h:mm a") : null);
    return {
      id: r.id,
      date: formatManila(r.date, "yyyy-MM-dd"),
      day: formatManila(r.date, "EEE"),
      amIn: time(r.amTimeIn),
      amOut: time(r.amTimeOut),
      pmIn: time(r.pmTimeIn),
      pmOut: time(r.pmTimeOut),
      status: r.status,
      excuseReason: r.excuseReason,
      noDutyReason: r.noDutyReason,
    };
  });

  const flaggingConfig = await getFlaggingRuleConfig();
  // Excused and no-duty days never count as absences (PRD §10 Q4 drafted default).
  const absences = summary.absent;
  const earlyWarningExceeded = absences >= flaggingConfig.absenceEarlyWarning;
  const dropEligible = absences > flaggingConfig.dropEligibleAbove;
  const level: AttendanceLevel = dropEligible ? "DROP_ELIGIBLE" : earlyWarningExceeded ? "EARLY_WARNING" : "NONE";

  return {
    intern: {
      id: intern.id,
      schoolNumber: intern.schoolNumber,
      course: intern.course,
      schoolId: intern.assignedSchool.id,
      schoolName: intern.assignedSchool.name,
    },
    viewerRole: user.role,
    shiftingId,
    rows,
    summary,
    thresholds: {
      absenceEarlyWarning: flaggingConfig.absenceEarlyWarning,
      dropEligibleAbove: flaggingConfig.dropEligibleAbove,
      earlyWarningExceeded,
      dropEligible,
      level,
    },
  };
}

export interface MaterializedRecord {
  id: string;
  date: Date;
  status: AttendanceStatus;
  excuseReason: string | null;
  amTimeIn: Date | null;
  amTimeOut: Date | null;
  pmTimeIn: Date | null;
  pmTimeOut: Date | null;
  /** Set only on a synthesized no-duty row. */
  noDutyReason: string | null;
}

/**
 * Builds the day-by-day list for a shifting. A day with no AttendanceRecord row
 * is ABSENT only if attendance was expected on it (PRD §6.5) — the duty calendar
 * decides: a weekday outside the shifting's duty weekdays is skipped (never an
 * absence), and a no-class/no-duty day is synthesized as NO_DUTY. Such rows are
 * for display/count purposes only and are never persisted.
 *
 * Only days that are over become absences: today is shown only once it has a
 * real row (a punch or an excuse) — an intern who hasn't timed in yet this
 * morning is not absent yet — and future shifting days aren't absences either.
 * A real row always wins (a punch on a weekend or no-duty day is kept as is).
 */
export function materializeAttendanceRecords(
  records: AttendanceRecord[],
  shifting: Shifting,
  calendar: DutyCalendar,
): MaterializedRecord[] {
  const byDate = new Map(records.map((r) => [r.date.getTime(), r]));
  const today = todayManilaDateOnly();
  const rangeEnd = shifting.endDate < today ? shifting.endDate : today;

  const result: MaterializedRecord[] = [];
  for (
    let cursor = new Date(shifting.startDate);
    cursor <= rangeEnd;
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1))
  ) {
    const existing = byDate.get(cursor.getTime());
    if (existing) {
      result.push({ ...existing, noDutyReason: null });
      continue;
    }
    const kind = calendar.kind(cursor);
    const base = {
      id: `${shifting.id}-${cursor.toISOString().slice(0, 10)}`,
      date: new Date(cursor),
      excuseReason: null,
      amTimeIn: null,
      amTimeOut: null,
      pmTimeIn: null,
      pmTimeOut: null,
    };
    if (kind === "NO_DUTY") {
      result.push({ ...base, id: `noduty-${base.id}`, status: "NO_DUTY", noDutyReason: calendar.noDutyReason(cursor) });
    } else if (kind === "EXPECTED" && cursor.getTime() < today.getTime()) {
      result.push({ ...base, id: `absent-${base.id}`, status: "ABSENT", noDutyReason: null });
    }
  }

  return result.sort((a, b) => b.date.getTime() - a.date.getTime());
}
