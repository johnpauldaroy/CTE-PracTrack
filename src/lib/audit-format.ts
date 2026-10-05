import { formatInTimeZone } from "date-fns-tz";
import { MANILA_TZ } from "@/lib/timezone";

// Turns raw AuditLog rows (action codes + JSON diffs) into plain-language text
// for the admin Audit Log. Pure functions only — no database access — so the
// wording can be unit-tested; display names for ids are passed in as `names`.

/** Display names keyed by record id (schools, users, interns, shiftings, …). */
export type NameLookup = Record<string, string>;

export interface AuditChangeRow {
  label: string;
  /** Absent for a newly-set value or a snapshot row. */
  before?: string;
  after?: string;
}

export interface AuditLogLike {
  action: string;
  entityType: string;
  entityId: string;
  actorName: string;
  diff: unknown;
}

export const ACTION_LABELS: Record<string, string> = {
  ACADEMIC_YEAR_ARCHIVE: "Archived academic year",
  ALERT_RESOLVE: "Resolved alert",
  ATTENDANCE_MARK_EXCUSED: "Marked day excused",
  ATTENDANCE_TIME_IN: "Timed in",
  ATTENDANCE_TIME_OUT: "Timed out",
  CHECKIN_CONFIG_UPDATE: "Changed global check-in times",
  CT_APPROVE: "Approved cooperating teacher",
  CT_DELETE: "Removed cooperating teacher",
  CT_REGISTRATION_REJECT: "Rejected CT registration",
  DOCUMENT_REPLACE: "Replaced document",
  DOCUMENT_UPLOAD: "Uploaded document",
  END_SUBMISSION_UPLOAD: "Uploaded end-of-term submission",
  EVALUATION_SUBMIT: "Submitted evaluation",
  FLAGGING_RULES_UPDATE: "Changed flagging rules",
  INTERN_ACCOUNT_CREATE: "Created intern account",
  INTERN_ACCOUNT_DELETE: "Deleted intern account",
  INTERN_ACCOUNT_UPDATE: "Edited intern account",
  INTERN_CT_ASSIGN: "Assigned cooperating teacher",
  PASSWORD_CHANGE: "Changed password",
  PROFILE_PHOTO_REMOVE: "Removed profile photo",
  PROFILE_PHOTO_REPLACE: "Replaced profile photo",
  PROFILE_PHOTO_UPLOAD: "Uploaded profile photo",
  SCHOOL_CHECKIN_OVERRIDE_UPDATE: "Changed school check-in times",
  SCHOOL_CREATE: "Added school",
  SCHOOL_DELETE: "Deleted school",
  SCHOOL_RESTORE: "Restored school",
  SCHOOL_SUPERVISOR_ASSIGN: "Assigned supervisor",
  SCHOOL_UPDATE: "Edited school",
  SEMESTER_CREATE: "Created semester",
  SESSION_ASSIGN: "Assigned teaching session",
  SHIFTING_ACTIVATE: "Activated shifting",
  SHIFTING_CONFIGURE: "Edited shifting",
  SUPERVISOR_CREATE: "Added supervisor",
  SUPERVISOR_DELETE: "Deleted supervisor",
  SUPERVISOR_UPDATE: "Edited supervisor",
};

const FIELD_LABELS: Record<string, string> = {
  absenceEarlyWarning: "Absence early-warning threshold",
  activeShiftingId: "Active shifting",
  assignedSchoolId: "School",
  behindPaceTolerance: "Behind-pace tolerance",
  consecutiveAbsences: "Consecutive-absence threshold",
  cooperatingTeacherId: "Cooperating teacher",
  course: "Course",
  deleted: "Deleted",
  department: "Department",
  distanceMeters: "Distance from school",
  dropEligibleAbove: "Drop-eligible above (absences)",
  email: "Email",
  endDate: "End date",
  evaluationPendingDays: "Evaluation pending after (days)",
  filename: "File",
  geofenceRadiusMeters: "Geofence radius",
  internId: "Intern",
  isArchived: "Archived",
  latitude: "Latitude",
  longitude: "Longitude",
  municipality: "Municipality",
  name: "Name",
  overallScore: "Overall score",
  previousActiveShiftingId: "Previously active shifting",
  reason: "Reason",
  requiredFinalDemos: "Required final demos",
  requiredTeachingSessions: "Required teaching sessions",
  resolutionNote: "Resolution note",
  schoolId: "School",
  schoolNumber: "School ID number",
  sessionId: "Teaching session",
  sessionNumber: "Session number",
  shiftingId: "Shifting",
  sizeBytes: "File size",
  startDate: "Start date",
  status: "Status",
  supervisorName: "Supervisor",
  supervisorUnassigned: "Supervisor unassigned",
  supervisorUserId: "Supervisor",
  timeIn: "Time in",
  timeInCutoff: "Time-in cut-off",
  timeOut: "Time out",
  timeOutStart: "Time-out start",
  type: "Type",
  yearLevel: "Year level",
};

/** Never shown, even if a diff ever carried them. */
const HIDDEN_FIELDS = new Set(["initialPassword", "password", "passwordHash"]);
/** Shown via the summary sentence or another field, so they'd only add noise as rows. */
const REDUNDANT_FIELDS = new Set(["supervisorUserId"]);

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? humanize(action);
}

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? humanize(key.replace(/([a-z])([A-Z])/g, "$1 $2"));
}

function humanize(code: string): string {
  const words = code.replace(/_/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const MANILA_WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/; // written by attendance-service via formatManila
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats one diff value for display. */
export function formatAuditValue(key: string, value: unknown, names: NameLookup = {}): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "string" && /Id$/.test(key)) return names[value] ?? value;

  if (key === "distanceMeters" || key === "geofenceRadiusMeters") return `${value} m`;
  if (key === "overallScore") return `${Number(value).toFixed(2)}%`;
  if (key === "sizeBytes" && typeof value === "number") {
    return value >= 1_048_576 ? `${(value / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  if (typeof value === "string") {
    if (ISO_DATE_ONLY.test(value)) {
      // @db.Date values are UTC midnights that represent a calendar day — no time-zone shift.
      const [y, m, d] = value.slice(0, 10).split("-").map(Number);
      return `${MONTHS[m - 1]} ${d}, ${y}`;
    }
    if (ISO_DATE_TIME.test(value) && !Number.isNaN(Date.parse(value))) {
      return formatInTimeZone(new Date(value), MANILA_TZ, "MMM d, yyyy h:mm a");
    }
    const wall = MANILA_WALL_CLOCK.exec(value);
    if (wall) {
      const [, y, m, d, hh, mm] = wall.map(Number);
      const hour12 = hh % 12 === 0 ? 12 : hh % 12;
      return `${MONTHS[m - 1]} ${d}, ${y} ${hour12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
    }
    // Enum codes such as INCOMPLETE or LESSON_PLAN, optionally followed by a note: "ABSENT (no prior record)".
    const code = /^([A-Z][A-Z_]+)(\s.*)?$/.exec(value);
    if (code) return humanize(code[1]) + (code[2] ?? "");
    return value;
  }

  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
}

/** Comparable form, so a Decimal serialized as "0" and a number 0 aren't reported as a change. */
function normalize(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)) && !/^0\d/.test(value)) {
    return String(Number(value));
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

function visibleKeys(record: Record<string, unknown>) {
  return Object.keys(record).filter((key) => !HIDDEN_FIELDS.has(key) && !REDUNDANT_FIELDS.has(key));
}

/**
 * The rows to show under "Changes":
 * - before + after → only the fields whose value actually changed (before → after)
 * - after only → each value that was set
 * - a *_DELETE action → the record as it was at deletion (from `before`)
 */
export function auditChanges(action: string, diff: unknown, names: NameLookup = {}): AuditChangeRow[] {
  const record = asRecord(diff);
  if (!record) return [];
  const before = asRecord(record.before);
  const after = asRecord(record.after);
  const rows: AuditChangeRow[] = [];

  if (action.endsWith("_DELETE") && before) {
    for (const key of visibleKeys(before)) {
      rows.push({ label: fieldLabel(key), after: formatAuditValue(key, before[key], names) });
    }
    return rows;
  }

  if (before && after) {
    for (const key of visibleKeys(after)) {
      if (normalize(before[key]) === normalize(after[key])) continue;
      rows.push({
        label: fieldLabel(key),
        before: formatAuditValue(key, before[key], names),
        after: formatAuditValue(key, after[key], names),
      });
    }
    return rows;
  }

  if (after) {
    for (const key of visibleKeys(after)) {
      if (after[key] === undefined) continue;
      rows.push({ label: fieldLabel(key), after: formatAuditValue(key, after[key], names) });
    }
  }
  return rows;
}

/** One plain-language sentence describing what happened. */
export function summarizeAudit(log: AuditLogLike, names: NameLookup = {}): string {
  const actor = log.actorName;
  const entity = names[log.entityId] ?? `${humanize(log.entityType.replace(/([a-z])([A-Z])/g, "$1_$2"))} ${log.entityId}`;
  const record = asRecord(log.diff);
  const after = asRecord(record?.after) ?? {};
  const value = (key: string) => formatAuditValue(key, after[key], names);
  const distance = after.distanceMeters !== undefined ? ` — ${value("distanceMeters")} from the school` : "";
  const status = after.status ? ` (${value("status")})` : "";

  switch (log.action) {
    case "ATTENDANCE_TIME_IN":
      return `${actor} timed in${distance}${status}.`;
    case "ATTENDANCE_TIME_OUT":
      return `${actor} timed out${distance}${status}.`;
    case "ATTENDANCE_MARK_EXCUSED":
      return `${actor} marked ${entity} as excused${after.reason ? `: “${String(after.reason)}”` : ""}.`;
    case "ALERT_RESOLVE":
      return `${actor} resolved the alert “${entity}”.`;
    case "CHECKIN_CONFIG_UPDATE":
      return `${actor} changed the global check-in times.`;
    case "FLAGGING_RULES_UPDATE":
      return `${actor} changed the flagging rules.`;
    case "SCHOOL_CHECKIN_OVERRIDE_UPDATE":
      return `${actor} changed the check-in times for ${entity}.`;
    case "SCHOOL_CREATE":
      return `${actor} added ${entity}.`;
    case "SCHOOL_UPDATE":
      return `${actor} edited ${entity}.`;
    case "SCHOOL_DELETE":
      return `${actor} deleted ${entity}.`;
    case "SCHOOL_RESTORE":
      return `${actor} restored ${entity}.`;
    case "SCHOOL_SUPERVISOR_ASSIGN":
      return `${actor} assigned ${after.supervisorName ? String(after.supervisorName) : "a supervisor"} to ${entity}.`;
    case "CT_APPROVE":
      return `${actor} approved ${entity} as a cooperating teacher.`;
    case "CT_REGISTRATION_REJECT":
      return `${actor} rejected the registration of ${entity}.`;
    case "CT_DELETE":
      return `${actor} removed cooperating teacher ${entity}.`;
    case "EVALUATION_SUBMIT":
      return `${actor} submitted the evaluation for ${entity}${after.overallScore !== undefined ? ` — ${value("overallScore")}` : ""}.`;
    case "SESSION_ASSIGN":
      return `${actor} assigned ${entity}.`;
    case "DOCUMENT_UPLOAD":
    case "DOCUMENT_REPLACE":
      return `${actor} ${log.action === "DOCUMENT_REPLACE" ? "replaced" : "uploaded"} a ${value("type").toLowerCase()} for ${entity}${after.filename ? ` (${String(after.filename)})` : ""}.`;
    case "END_SUBMISSION_UPLOAD":
      return `${actor} uploaded their ${value("type").toLowerCase()}${after.filename ? ` (${String(after.filename)})` : ""}.`;
    case "INTERN_ACCOUNT_CREATE":
      return `${actor} created the intern account for ${entity}.`;
    case "INTERN_ACCOUNT_UPDATE":
      return `${actor} edited the intern account of ${entity}.`;
    case "INTERN_ACCOUNT_DELETE":
      return `${actor} deleted the intern account of ${entity}.`;
    case "INTERN_CT_ASSIGN":
      return after.cooperatingTeacherId
        ? `${actor} assigned ${value("cooperatingTeacherId")} as cooperating teacher of ${entity}.`
        : `${actor} removed the cooperating teacher of ${entity}.`;
    case "PASSWORD_CHANGE":
      return `${actor} changed their password.`;
    case "PROFILE_PHOTO_UPLOAD":
      return `${actor} uploaded a profile photo.`;
    case "PROFILE_PHOTO_REPLACE":
      return `${actor} replaced their profile photo.`;
    case "PROFILE_PHOTO_REMOVE":
      return `${actor} removed their profile photo.`;
    case "ACADEMIC_YEAR_ARCHIVE":
      return `${actor} archived ${entity}.`;
    case "SEMESTER_CREATE":
      return `${actor} created ${entity}.`;
    case "SHIFTING_ACTIVATE":
      return `${actor} activated ${entity}.`;
    case "SHIFTING_CONFIGURE":
      return `${actor} edited ${entity}.`;
    case "SUPERVISOR_CREATE":
      return `${actor} added supervisor ${entity}.`;
    case "SUPERVISOR_UPDATE":
      return `${actor} edited supervisor ${entity}.`;
    case "SUPERVISOR_DELETE":
      return `${actor} deleted supervisor ${entity}.`;
    default:
      return `${actor}: ${actionLabel(log.action).toLowerCase()} — ${entity}.`;
  }
}
