import { prisma } from "@/lib/prisma";
import { scopeToRole } from "@/lib/scope";
import { getFlaggingRuleConfig } from "@/lib/check-in-config";
import { formatManila, todayManilaDateOnly } from "@/lib/timezone";
import type { SessionUser } from "@/lib/auth";
import type { AttendanceRecord, Shifting } from "@/generated/prisma/client";

export interface DtrSummary {
  present: number;
  absent: number;
  incomplete: number;
  late: number;
  excused: number;
}

export interface DtrRow {
  id: string;
  date: string; // yyyy-MM-dd (Manila)
  day: string; // e.g. "Wed"
  timeIn: string | null;
  timeOut: string | null;
  status: string;
  excuseReason: string | null;
}

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
  });
  const shifting = await prisma.shifting.findUniqueOrThrow({ where: { id: shiftingId } });

  const records = await prisma.attendanceRecord.findMany({
    where: { internId: intern.id, shiftingId },
    orderBy: { date: "desc" },
  });

  const allRecords = withMaterializedAbsences(records, shifting);

  const summary: DtrSummary = { present: 0, absent: 0, incomplete: 0, late: 0, excused: 0 };
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
    }
    return {
      id: r.id,
      date: formatManila(r.date, "yyyy-MM-dd"),
      day: formatManila(r.date, "EEE"),
      timeIn: r.timeIn ? formatManila(r.timeIn, "h:mm a") : null,
      timeOut: r.timeOut ? formatManila(r.timeOut, "h:mm a") : null,
      status: r.status,
      excuseReason: r.excuseReason,
    };
  });

  const flaggingConfig = await getFlaggingRuleConfig();
  // Excused days are excluded from all threshold counts (PRD §10 Q4 drafted
  // default — the point of excusing is that it doesn't count against the
  // intern; flagged as an open question in PROGRESS.md, implementing the
  // drafted default here rather than silently picking a different one).
  const countingAbsences = summary.absent;

  return {
    intern: { id: intern.id, schoolNumber: intern.schoolNumber, course: intern.course },
    rows,
    summary,
    thresholds: {
      absenceEarlyWarning: flaggingConfig.absenceEarlyWarning,
      dropEligibleAbove: flaggingConfig.dropEligibleAbove,
      earlyWarningExceeded: countingAbsences >= flaggingConfig.absenceEarlyWarning,
      approachingDropLimit: countingAbsences >= flaggingConfig.dropEligibleAbove - 3 && countingAbsences <= flaggingConfig.dropEligibleAbove,
      dropEligible: countingAbsences > flaggingConfig.dropEligibleAbove,
    },
  };
}

type MaterializedRecord = Pick<
  AttendanceRecord,
  "id" | "date" | "timeIn" | "timeOut" | "status" | "excuseReason"
>;

/**
 * A day within the shifting's date range with no AttendanceRecord row is
 * ABSENT (PRD §6.5: "a day within the shifting with neither is ABSENT") —
 * there is no row to represent it, so one is synthesized for display/count
 * purposes only (never persisted). Only days up to and including today are
 * materialized; future shifting days aren't "absences" yet.
 *
 * OPEN QUESTION not resolved here: the PRD never defines a school calendar
 * or excludes weekends/holidays from this rule, so every day in range
 * (Mon-Sun) is currently treated as a day attendance is expected. If the
 * CTE's real practicum calendar only expects weekdays, this needs a
 * "school day" concept added to Shifting/School before this is correct —
 * flagging rather than silently assuming weekdays-only.
 */
function withMaterializedAbsences(records: AttendanceRecord[], shifting: Shifting): MaterializedRecord[] {
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
      result.push(existing);
    } else {
      result.push({
        id: `absent-${shifting.id}-${cursor.toISOString().slice(0, 10)}`,
        date: new Date(cursor),
        timeIn: null,
        timeOut: null,
        status: "ABSENT",
        excuseReason: null,
      });
    }
  }

  return result.sort((a, b) => b.date.getTime() - a.date.getTime());
}
