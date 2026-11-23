"use client";
import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertGroupCard } from "@/components/alert-group-card";
import { ShowMoreButton, useShowMore } from "@/components/pagination";
import { groupAlertsByIntern, type GroupableAlert } from "@/lib/alert-groups";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const MIN_NOTE = 10;

export default function SupervisorAlertsPage() {
  const { data, mutate } = useSWR<{ alerts: GroupableAlert[] }>("/api/alerts", fetcher);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const groups = groupAlertsByIntern(data?.alerts ?? []);
  const more = useShowMore(groups, 10);

  async function refresh() {
    setBusy(true);
    const response = await fetch("/api/alerts", { method: "POST" });
    setBusy(false);
    if (!response.ok) {
      toast.error("Unable to evaluate alerts.");
      return;
    }
    const { result } = await response.json();
    toast.success(result.raised ? `${result.raised} new alert(s) raised.` : "Rules evaluated — no new alerts.");
    mutate();
  }

  /** One note resolves every active flag of the student; each alert is still resolved (and audited) on its own. */
  async function resolveGroup(internId: string, alertIds: string[]) {
    const note = notes[internId]?.trim() ?? "";
    setBusy(true);
    let failed = 0;
    for (const id of alertIds) {
      const response = await fetch(`/api/alerts/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!response.ok) failed++;
    }
    setBusy(false);
    if (failed) toast.error(`${failed} of ${alertIds.length} flags could not be resolved. Please try again.`);
    else toast.success("Resolved. The CTE office can read your note.");
    mutate();
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold">Alerts</h1>
        <Button size="sm" variant="outline" onClick={refresh} disabled={busy}>
          {busy ? "Working…" : "Refresh rules"}
        </Button>
      </div>
      {groups.length ? (
        <>
          {more.rows.map((group) => {
            const note = notes[group.internId] ?? "";
            return (
              <AlertGroupCard key={group.internId} group={group}>
                <Textarea
                  className="mt-3"
                  placeholder="Resolution note (required) — what was done about this student?"
                  value={note}
                  onChange={(event) => setNotes((old) => ({ ...old, [group.internId]: event.target.value }))}
                />
                <Button
                  className="mt-2 w-full"
                  size="sm"
                  disabled={busy || note.trim().length < MIN_NOTE}
                  onClick={() => resolveGroup(group.internId, group.alerts.map((alert) => alert.id))}
                >
                  {group.alerts.length > 1 ? `Resolve all ${group.alerts.length} flags` : "Resolve Alert"}
                </Button>
              </AlertGroupCard>
            );
          })}
          <ShowMoreButton hasMore={more.hasMore} remaining={more.remaining} onClick={more.showMore} />
        </>
      ) : (
        <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">No active alerts.</p>
      )}
    </div>
  );
}
