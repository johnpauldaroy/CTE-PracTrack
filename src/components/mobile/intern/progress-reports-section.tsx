"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { formatManila } from "@/lib/timezone";
import { ProgressReportStateBadge, type ProgressReportState } from "@/components/progress-report-state";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PeriodRow {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  state: ProgressReportState;
  submission: { id: string; originalFilename: string; uploadedAt: string } | null;
}

/** The intern's progress reports to the school: one upload per period the admin configured. */
export function ProgressReportsSection() {
  const { data, mutate } = useSWR<{ periods: PeriodRow[] }>("/api/intern/progress-reports", fetcher);
  const [busy, setBusy] = useState<string | null>(null);

  async function upload(periodId: string, input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setBusy(periodId);
    const form = new FormData();
    form.set("periodId", periodId);
    form.set("file", file);
    try {
      const res = await fetch("/api/intern/progress-reports", { method: "POST", body: form });
      const result = await res.json();
      if (!res.ok) return toast.error(result.error ?? "Upload failed.");
      toast.success("Progress report submitted.");
      mutate();
    } catch {
      toast.error("No connection. Uploads need you to be online.");
    } finally {
      setBusy(null);
    }
  }

  async function view(id: string) {
    const res = await fetch(`/api/progress-reports/${id}/url`);
    const result = await res.json();
    if (res.ok) window.open(result.url, "_blank", "noopener,noreferrer");
    else toast.error(result.error ?? "Could not open the file.");
  }

  const periods = data?.periods ?? [];
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Progress Reports</h2>
      <p className="text-xs text-muted-foreground">Submitted to the school. Your supervisor and the CTE office can view them.</p>
      {periods.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No reporting periods have been set yet.</p>
      ) : (
        periods.map((period) => (
          <div key={period.id} className="mt-3 flex items-center justify-between gap-2 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium">
                {period.label} <ProgressReportStateBadge state={period.state} />
              </p>
              <p className="text-xs text-muted-foreground">
                {formatManila(new Date(period.startDate), "MMM d")} – {formatManila(new Date(period.endDate), "MMM d")} · due{" "}
                {formatManila(new Date(period.dueDate), "MMM d")}
              </p>
              {period.submission && (
                <button
                  onClick={() => view(period.submission!.id)}
                  className="block max-w-48 truncate text-xs text-primary underline"
                >
                  {period.submission.originalFilename}
                </button>
              )}
            </div>
            {period.state !== "UPCOMING" && (
              <label className="shrink-0 cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium">
                {busy === period.id ? "Uploading…" : period.submission ? "Replace" : "Upload"}
                <input
                  className="sr-only"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  disabled={!!busy}
                  onChange={(event) => upload(period.id, event.currentTarget)}
                />
              </label>
            )}
          </div>
        ))
      )}
    </section>
  );
}
