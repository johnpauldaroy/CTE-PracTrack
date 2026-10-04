import { prisma } from "@/lib/prisma";
import { scopeToRole } from "@/lib/scope";
import { writeAuditLog } from "@/lib/audit";
import { ForbiddenError } from "@/lib/session";
import { getFlaggingRuleConfig } from "@/lib/check-in-config";
import { materializeAttendanceRecords } from "@/lib/services/dtr-service";
import type { SessionUser } from "@/lib/auth";
import { Prisma, type AlertSeverity, type AlertType, type NotificationType } from "@/generated/prisma/client";

/** How stale the last full rule run may be before a dashboard read triggers a new one. */
export const ALERT_FRESHNESS_MS = 60 * 60 * 1000;
const SYSTEM_STATE_ID = "singleton";

export interface AlertEvaluationResult {
  evaluated: number;
  raised: number;
  updated: number;
}

/**
 * The at-risk rule engine. Evaluates every flagging rule (thresholds read from
 * FlaggingRuleConfig — never constants) for interns in the active shifting and
 * creates/updates ACTIVE alerts. Runs without a session so the daily cron, the
 * dashboard freshness check, and mutation hooks can all share it; callers that
 * act on behalf of a user narrow `where` with scopeToRole first.
 *
 * Alerts are never auto-resolved here: resolution is an audited supervisor/admin
 * action with a note. When a rule is still true, the existing alert's detail is
 * refreshed instead of raising a duplicate (enforced by the partial unique index
 * "Alert_one_active_per_type").
 */
export async function evaluateAlertsForShifting(
  options: { where?: Prisma.InternProfileWhereInput; internIds?: string[] } = {},
): Promise<AlertEvaluationResult> {
  const result: AlertEvaluationResult = { evaluated: 0, raised: 0, updated: 0 };
  const shifting = await prisma.shifting.findFirst({ where: { status: "ACTIVE" } });
  if (!shifting) return result;

  const config = await getFlaggingRuleConfig();
  const interns = await prisma.internProfile.findMany({
    where: {
      ...options.where,
      ...(options.internIds ? { id: { in: options.internIds } } : {}),
      user: { deletedAt: null },
    },
    include: {
      user: { select: { name: true } },
      attendanceRecords: { where: { shiftingId: shifting.id } },
      teachingSessions: { where: { shiftingId: shifting.id }, include: { evaluation: { select: { id: true } } } },
    },
  });
  if (!interns.length) return result;

  const existingAlerts = await prisma.alert.findMany({
    where: { shiftingId: shifting.id, status: "ACTIVE", internId: { in: interns.map((intern) => intern.id) } },
  });
  const existingByKey = new Map(existingAlerts.map((alert) => [`${alert.internId}:${alert.type}`, alert]));

  const now = Date.now();
  const raisedAlerts: { internUserId: string; internName: string; schoolId: string; severity: AlertSeverity; detail: string }[] = [];

  for (const intern of interns) {
    result.evaluated++;
    // materializeAttendanceRecords only counts today once it has a real row, so an
    // intern who hasn't timed in yet this morning isn't flagged.
    const rows = materializeAttendanceRecords(intern.attendanceRecords, shifting).sort((a, b) => a.date.getTime() - b.date.getTime());
    const absences = rows.filter((row) => row.status === "ABSENT").length;
    let longest = 0;
    let run = 0;
    for (const row of rows) {
      run = row.status === "ABSENT" ? run + 1 : 0;
      longest = Math.max(longest, run);
    }

    const elapsed = Math.max(1, now - shifting.startDate.getTime());
    const duration = Math.max(1, shifting.endDate.getTime() - shifting.startDate.getTime());
    const expected = Math.min(1, elapsed / duration) * shifting.requiredTeachingSessions;
    const completed = intern.teachingSessions.filter((s) => s.status === "EVALUATED" && s.type === "REGULAR").length;
    const pendingCutoff = now - config.evaluationPendingDays * 86_400_000;
    const pending = intern.teachingSessions.filter((s) => !s.evaluation && s.date.getTime() < pendingCutoff).length;
    const tolerance = Number(config.behindPaceTolerance);

    const rules: { type: AlertType; condition: boolean; severity: AlertSeverity; detail: string }[] = [
      { type: "ABSENCE_EARLY_WARNING", condition: absences >= config.absenceEarlyWarning, severity: "MEDIUM", detail: `${absences} absences — early-warning threshold is ${config.absenceEarlyWarning}.` },
      { type: "CONSECUTIVE_ABSENCES", condition: longest >= config.consecutiveAbsences, severity: "HIGH", detail: `${longest} consecutive absences — threshold is ${config.consecutiveAbsences}.` },
      { type: "DROP_ELIGIBLE", condition: absences > config.dropEligibleAbove, severity: "HIGH", detail: `${absences} absences — above the drop-eligible limit of ${config.dropEligibleAbove}.` },
      { type: "BEHIND_PACE", condition: completed + tolerance < expected, severity: "MEDIUM", detail: `${completed} evaluated sessions; expected pace is ${expected.toFixed(1)} with tolerance ${tolerance}.` },
      { type: "EVALUATION_PENDING", condition: pending > 0, severity: "LOW", detail: `${pending} session(s) await evaluation beyond ${config.evaluationPendingDays} days.` },
    ];

    for (const rule of rules) {
      if (!rule.condition) continue;
      const existing = existingByKey.get(`${intern.id}:${rule.type}`);
      if (existing) {
        if (existing.detail !== rule.detail || existing.severity !== rule.severity) {
          await prisma.alert.update({ where: { id: existing.id }, data: { detail: rule.detail, severity: rule.severity } });
          result.updated++;
        }
        continue;
      }
      try {
        await prisma.alert.create({
          data: { internId: intern.id, shiftingId: shifting.id, type: rule.type, detail: rule.detail, severity: rule.severity },
        });
      } catch (error) {
        // A concurrent run (cron + dashboard) already raised it — not a new alert.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
        throw error;
      }
      result.raised++;
      raisedAlerts.push({ internUserId: intern.userId, internName: intern.user.name, schoolId: intern.assignedSchoolId, severity: rule.severity, detail: rule.detail });
    }
  }

  if (raisedAlerts.length) await notifyRaisedAlerts(raisedAlerts);
  return result;
}

async function notifyRaisedAlerts(
  raised: { internUserId: string; internName: string; schoolId: string; severity: AlertSeverity; detail: string }[],
) {
  const schoolIds = [...new Set(raised.map((alert) => alert.schoolId))];
  const [supervisors, admins] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SUPERVISOR", status: "ACTIVE", deletedAt: null, supervisorProfile: { schoolId: { in: schoolIds } } },
      select: { id: true, supervisorProfile: { select: { schoolId: true } } },
    }),
    raised.some((alert) => alert.severity === "HIGH")
      ? prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE", deletedAt: null }, select: { id: true } })
      : Promise.resolve([]),
  ]);

  const type: NotificationType = "ALERT_RAISED";
  const data: Prisma.NotificationCreateManyInput[] = [];
  for (const alert of raised) {
    data.push({ userId: alert.internUserId, type, title: "Practicum alert", body: alert.detail, href: "/m/intern/attendance" });
    for (const supervisor of supervisors) {
      if (supervisor.supervisorProfile?.schoolId !== alert.schoolId) continue;
      data.push({ userId: supervisor.id, type, title: `${alert.internName} requires attention`, body: alert.detail, href: "/m/supervisor/alerts" });
    }
    // Admins only hear about HIGH severity (drop-eligible, consecutive absences) to keep the feed actionable.
    if (alert.severity === "HIGH") {
      for (const admin of admins) {
        data.push({ userId: admin.id, type, title: `${alert.internName} requires attention`, body: alert.detail, href: "/dashboard" });
      }
    }
  }
  await prisma.notification.createMany({ data });
}

/** Full run for every intern in the active shifting; records the run time. */
export async function evaluateAllAlerts(): Promise<AlertEvaluationResult> {
  const result = await evaluateAlertsForShifting();
  await prisma.systemState.upsert({
    where: { id: SYSTEM_STATE_ID },
    update: { alertsEvaluatedAt: new Date() },
    create: { id: SYSTEM_STATE_ID, alertsEvaluatedAt: new Date() },
  });
  return result;
}

/**
 * Re-runs the engine when the last full run is older than ALERT_FRESHNESS_MS.
 * Called from dashboard reads so alerts are current even when the daily cron
 * hasn't fired (local dev, preview deploys, or a missed run). Never throws —
 * a failed evaluation must not take the dashboard down with it.
 */
export async function ensureAlertsFresh(): Promise<void> {
  try {
    const state = await prisma.systemState.findUnique({ where: { id: SYSTEM_STATE_ID } });
    if (state?.alertsEvaluatedAt && Date.now() - state.alertsEvaluatedAt.getTime() < ALERT_FRESHNESS_MS) return;
    await evaluateAllAlerts();
  } catch (error) {
    console.error("[alerts] freshness evaluation failed", error);
  }
}

/** Re-evaluates one intern after a mutation that affects their rules. Never throws. */
export async function refreshAlertsForIntern(internId: string): Promise<void> {
  try {
    await evaluateAlertsForShifting({ internIds: [internId] });
  } catch (error) {
    console.error(`[alerts] re-evaluation failed for intern ${internId}`, error);
  }
}

/** Manual "evaluate now" from the admin dashboard or supervisor alerts screen, scoped to the caller. */
export async function evaluateAlerts(actor: SessionUser): Promise<AlertEvaluationResult> {
  if (actor.role === "ADMIN") return evaluateAllAlerts();
  if (actor.role !== "SUPERVISOR") throw new ForbiddenError();
  return evaluateAlertsForShifting({ where: scopeToRole.intern(actor) });
}

export async function listAlerts(actor: SessionUser, status: "ACTIVE" | "RESOLVED" = "ACTIVE") { return prisma.alert.findMany({ where: { ...scopeToRole.alert(actor), status }, include: { intern: { include: { user: { select: { name: true } }, assignedSchool: { select: { name: true } } } }, resolvedByUser: { select: { name: true } } }, orderBy: status === "ACTIVE" ? [{ severity: "desc" }, { raisedAt: "desc" }] : { resolvedAt: "desc" } }); }
export async function resolveAlert(actor: SessionUser, id: string, note: string) { if (actor.role !== "SUPERVISOR" && actor.role !== "ADMIN") throw new ForbiddenError(); const alert = await prisma.alert.findFirst({ where: { ...scopeToRole.alert(actor), id, status: "ACTIVE" } }); if (!alert) throw new ForbiddenError("Alert is outside your scope or already resolved."); return prisma.$transaction(async (tx) => { const updated = await tx.alert.update({ where: { id }, data: { status: "RESOLVED", resolvedByUserId: actor.id, resolvedAt: new Date(), resolutionNote: note } }); await writeAuditLog({ actor, action: "ALERT_RESOLVE", entityType: "Alert", entityId: id, diff: { after: { status: "RESOLVED", resolutionNote: note } } as Prisma.InputJsonValue }, tx); return updated; }); }
