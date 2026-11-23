/**
 * One intern can trip several rules at once (early warning, consecutive absences, drop-eligible…).
 * Screens show one card per intern with every triggered rule listed. The alerts themselves are
 * untouched: each keeps its own row, severity and audit trail.
 */
export type AlertSeverityName = "LOW" | "MEDIUM" | "HIGH";

export interface GroupableAlert {
  id: string;
  internId: string;
  type: string;
  severity: AlertSeverityName;
  detail: string;
  raisedAt: string | Date;
  intern: { user: { name: string }; assignedSchool?: { name: string } | null };
}

export interface AlertGroup<T extends GroupableAlert> {
  internId: string;
  internName: string;
  schoolName: string | null;
  /** The highest severity among the intern's alerts. */
  severity: AlertSeverityName;
  alerts: T[];
}

const RANK: Record<AlertSeverityName, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

export function groupAlertsByIntern<T extends GroupableAlert>(alerts: T[]): AlertGroup<T>[] {
  const byIntern = new Map<string, AlertGroup<T>>();
  for (const alert of alerts) {
    const group = byIntern.get(alert.internId);
    if (group) {
      group.alerts.push(alert);
      if (RANK[alert.severity] > RANK[group.severity]) group.severity = alert.severity;
    } else {
      byIntern.set(alert.internId, {
        internId: alert.internId,
        internName: alert.intern.user.name,
        schoolName: alert.intern.assignedSchool?.name ?? null,
        severity: alert.severity,
        alerts: [alert],
      });
    }
  }
  const groups = [...byIntern.values()];
  for (const group of groups) {
    group.alerts.sort((a, b) => RANK[b.severity] - RANK[a.severity] || new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime());
  }
  return groups.sort(
    (a, b) => RANK[b.severity] - RANK[a.severity] || b.alerts.length - a.alerts.length || a.internName.localeCompare(b.internName),
  );
}
