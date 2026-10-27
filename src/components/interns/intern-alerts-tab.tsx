"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatManila } from "@/lib/timezone";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AlertRow {
  id: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  detail: string;
  raisedAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  resolvedByUser: { name: string } | null;
}

function AlertCard({ alert }: { alert: AlertRow }) {
  return (
    <article className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm">{alert.detail}</p>
        <Badge variant={alert.severity === "HIGH" ? "destructive" : "secondary"}>{alert.severity}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Raised {formatManila(new Date(alert.raisedAt), "MMM d, yyyy")}</p>
      {alert.resolvedAt && (
        <p className="mt-1 text-xs text-muted-foreground">
          Resolved by {alert.resolvedByUser?.name ?? "—"} · {formatManila(new Date(alert.resolvedAt), "MMM d, yyyy")}
          {alert.resolutionNote ? ` — ${alert.resolutionNote}` : ""}
        </p>
      )}
    </article>
  );
}

/** One intern's active and resolved alerts. Resolving stays on the Alerts page. */
export function InternAlertsTab({ internId }: { internId: string }) {
  const active = useSWR<{ alerts: AlertRow[] }>(`/api/alerts?internId=${internId}`, fetcher);
  const resolved = useSWR<{ alerts: AlertRow[] }>(`/api/alerts?status=resolved&internId=${internId}`, fetcher);
  if (active.isLoading || resolved.isLoading) return <Skeleton className="h-32 w-full" />;
  const activeAlerts = active.data?.alerts ?? [];
  const resolvedAlerts = resolved.data?.alerts ?? [];

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Active ({activeAlerts.length})</h3>
      {activeAlerts.length ? (
        activeAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
      ) : (
        <p className="text-sm text-muted-foreground">No active alerts.</p>
      )}
      <h3 className="text-sm font-semibold">Resolved ({resolvedAlerts.length})</h3>
      {resolvedAlerts.length ? (
        resolvedAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
      ) : (
        <p className="text-sm text-muted-foreground">No resolved alerts.</p>
      )}
    </div>
  );
}
