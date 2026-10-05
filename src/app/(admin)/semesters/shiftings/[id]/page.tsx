import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Archive } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getReports } from "@/lib/services/report-service";
import { formatManila } from "@/lib/timezone";
import { ReportDownloads, ShiftingReport, shiftingLabel } from "@/components/admin/reports/shifting-report";

/** Read-only archive of a completed shifting (PRD §6.1: completed shiftings remain viewable). */
export default async function ShiftingArchivePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("ADMIN");
  const { id } = await params;
  const data = await getReports(actor, { shiftingId: id });
  if (!data.shifting) notFound();
  // The active shifting lives on the Reports page; an upcoming one has nothing to archive yet.
  if (data.shifting.status === "ACTIVE") redirect("/reports");
  if (data.shifting.status === "UPCOMING") notFound();

  const shifting = data.shifting;
  const totals = {
    interns: data.attendance.reduce((n, row) => n + row.interns, 0),
    absences: data.attendance.reduce((n, row) => n + row.absences, 0),
    sessions: data.compliance.reduce((n, row) => n + row.sessionsLogged, 0),
    alerts: data.alerts.length,
    resolved: data.resolvedAlerts.length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/semesters" className="text-sm text-muted-foreground hover:underline">
            ← Semesters
          </Link>
          <h1 className="font-heading mt-1 text-2xl font-bold">{shiftingLabel(shifting)}</h1>
          <p className="text-sm text-muted-foreground">
            {formatManila(shifting.startDate, "MMM d, yyyy")} – {formatManila(shifting.endDate, "MMM d, yyyy")} ·{" "}
            {shifting.requiredTeachingSessions} sessions required · {shifting.requiredFinalDemos} Final Demo
            {shifting.completedAt ? ` · completed ${formatManila(shifting.completedAt, "MMM d, yyyy")}` : ""}
          </p>
        </div>
        <ReportDownloads shiftingId={shifting.id} />
      </div>

      <p className="flex items-center gap-2 rounded-lg border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        <Archive className="size-4 shrink-0" aria-hidden />
        Archived shifting — read-only. Figures are computed from the records kept for this shifting and its own
        requirements; nothing here can be edited.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile label="Interns with activity" value={totals.interns} />
        <Tile label="Absences" value={totals.absences} />
        <Tile label="Teaching sessions logged" value={totals.sessions} />
        <Tile label="Alerts raised" value={totals.alerts} hint={`${totals.resolved} resolved`} />
      </div>

      <ShiftingReport data={data} />
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <p className="text-2xl font-bold sm:text-3xl">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
