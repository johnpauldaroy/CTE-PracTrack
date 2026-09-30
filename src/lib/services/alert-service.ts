import { prisma } from "@/lib/prisma";
import { scopeToRole } from "@/lib/scope";
import { writeAuditLog } from "@/lib/audit";
import { ForbiddenError } from "@/lib/session";
import { getFlaggingRuleConfig } from "@/lib/check-in-config";
import { materializeAttendanceRecords } from "@/lib/services/dtr-service";
import type { SessionUser } from "@/lib/auth";
import type { AlertSeverity, AlertType, Prisma } from "@/generated/prisma/client";

export async function evaluateAlerts(actor: SessionUser) {
  if (actor.role !== "ADMIN" && actor.role !== "SUPERVISOR") throw new ForbiddenError();
  const shifting = await prisma.shifting.findFirst({ where: { status: "ACTIVE" } }); if (!shifting) return [];
  const config = await getFlaggingRuleConfig();
  const interns = await prisma.internProfile.findMany({ where: scopeToRole.intern(actor), include: { user: true, attendanceRecords: { where: { shiftingId: shifting.id } }, teachingSessions: { where: { shiftingId: shifting.id }, include: { evaluation: true } } } });
  const raised = [];
  for (const intern of interns) {
    const rows = materializeAttendanceRecords(intern.attendanceRecords, shifting).sort((a, b) => a.date.getTime() - b.date.getTime());
    const absences = rows.filter((row) => row.status === "ABSENT").length;
    let longest = 0, run = 0; for (const row of rows) { run = row.status === "ABSENT" ? run + 1 : 0; longest = Math.max(longest, run); }
    const elapsed = Math.max(1, Date.now() - shifting.startDate.getTime()); const duration = Math.max(1, shifting.endDate.getTime() - shifting.startDate.getTime()); const expected = Math.min(1, elapsed / duration) * shifting.requiredTeachingSessions; const completed = intern.teachingSessions.filter((s) => s.status === "EVALUATED" && s.type === "REGULAR").length;
    const pendingCutoff = Date.now() - config.evaluationPendingDays * 86_400_000; const pending = intern.teachingSessions.filter((s) => !s.evaluation && s.date.getTime() < pendingCutoff).length;
    const rules: { type: AlertType; condition: boolean; severity: AlertSeverity; detail: string }[] = [
      { type: "ABSENCE_EARLY_WARNING", condition: absences >= config.absenceEarlyWarning, severity: "MEDIUM", detail: `${absences} absences — early-warning threshold is ${config.absenceEarlyWarning}.` },
      { type: "CONSECUTIVE_ABSENCES", condition: longest >= config.consecutiveAbsences, severity: "HIGH", detail: `${longest} consecutive absences — threshold is ${config.consecutiveAbsences}.` },
      { type: "DROP_ELIGIBLE", condition: absences > config.dropEligibleAbove, severity: "HIGH", detail: `${absences} absences — above the drop-eligible limit of ${config.dropEligibleAbove}.` },
      { type: "BEHIND_PACE", condition: completed + Number(config.behindPaceTolerance) < expected, severity: "MEDIUM", detail: `${completed} evaluated sessions; expected pace is ${expected.toFixed(1)} with tolerance ${Number(config.behindPaceTolerance)}.` },
      { type: "EVALUATION_PENDING", condition: pending > 0, severity: "LOW", detail: `${pending} session(s) await evaluation beyond ${config.evaluationPendingDays} days.` },
    ];
    for (const rule of rules) if (rule.condition) {
      const existing = await prisma.alert.findFirst({ where: { internId: intern.id, shiftingId: shifting.id, type: rule.type, status: "ACTIVE" } });
      const alert = existing ? await prisma.alert.update({ where: { id: existing.id }, data: { detail: rule.detail, severity: rule.severity } }) : await prisma.alert.create({ data: { internId: intern.id, shiftingId: shifting.id, type: rule.type, detail: rule.detail, severity: rule.severity } });
      if (!existing) { await prisma.notification.create({ data: { userId: intern.userId, type: "ALERT_RAISED", title: "Practicum alert", body: rule.detail } }); const supervisors = await prisma.user.findMany({ where: { supervisorProfile: { schoolId: intern.assignedSchoolId }, status: "ACTIVE" } }); if (supervisors.length) await prisma.notification.createMany({ data: supervisors.map((user) => ({ userId: user.id, type: "ALERT_RAISED" as const, title: `${intern.user.name} requires attention`, body: rule.detail })) }); }
      raised.push(alert);
    }
  }
  return raised;
}

export async function listAlerts(actor: SessionUser, status: "ACTIVE" | "RESOLVED" = "ACTIVE") { return prisma.alert.findMany({ where: { ...scopeToRole.alert(actor), status }, include: { intern: { include: { user: { select: { name: true } }, assignedSchool: { select: { name: true } } } }, resolvedByUser: { select: { name: true } } }, orderBy: { raisedAt: "desc" } }); }
export async function resolveAlert(actor: SessionUser, id: string, note: string) { if (actor.role !== "SUPERVISOR" && actor.role !== "ADMIN") throw new ForbiddenError(); const alert = await prisma.alert.findFirst({ where: { ...scopeToRole.alert(actor), id, status: "ACTIVE" } }); if (!alert) throw new ForbiddenError("Alert is outside your scope or already resolved."); return prisma.$transaction(async (tx) => { const updated = await tx.alert.update({ where: { id }, data: { status: "RESOLVED", resolvedByUserId: actor.id, resolvedAt: new Date(), resolutionNote: note } }); await writeAuditLog({ actor, action: "ALERT_RESOLVE", entityType: "Alert", entityId: id, diff: { after: { status: "RESOLVED", resolutionNote: note } } as Prisma.InputJsonValue }, tx); return updated; }); }
