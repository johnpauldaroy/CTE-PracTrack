"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { CalendarOff, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ShiftingTabs } from "@/components/shifting-tabs";
import { useShiftingSelection } from "@/components/interns/use-shifting-selection";
import { DtrTable, type DtrRowData } from "@/components/dtr-table";
import { AttendanceAlertBanner, type AttendanceLevel } from "@/components/attendance-alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DtrResponse {
  intern: { id: string; schoolId: string; schoolName: string };
  viewerRole: "ADMIN" | "SUPERVISOR" | "COOPERATING_TEACHER" | "STUDENT_INTERN";
  rows: DtrRowData[];
  summary: { present: number; absent: number; incomplete: number; late: number; excused: number; noDuty: number };
  thresholds: { absenceEarlyWarning: number; dropEligibleAbove: number; level: AttendanceLevel };
}

interface NoDutyEntry {
  id: string;
  date: string;
  reason: string;
  scope: "INTERN" | "SCHOOL" | "ALL";
  label: string;
  canRemove: boolean;
}

type Scope = "INTERN" | "SCHOOL" | "ALL";
type Panel = { kind: "excuse"; date: string } | { kind: "noduty"; date: string } | null;

const SCOPE_LABEL: Record<Scope, string> = { INTERN: "This intern", SCHOOL: "Whole school", ALL: "All schools" };

/**
 * Staff view of one intern's DTR (supervisor page and admin drawer): the table, the
 * attendance banner, and the two ways to keep a day from counting as an absence —
 * Excused (this intern, needs a reason) and No class / duty (a calendar exception).
 */
export function InternDtrTab({ internId }: { internId: string }) {
  const { shiftings, shiftingId: effectiveShiftingId, setShiftingId } = useShiftingSelection();
  const [panel, setPanel] = useState<Panel>(null);
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<Scope>("INTERN");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, mutate } = useSWR<DtrResponse>(
    effectiveShiftingId ? `/api/interns/${internId}/dtr?shiftingId=${effectiveShiftingId}` : null,
    fetcher,
  );
  const { data: noDutyData, mutate: mutateNoDuty } = useSWR<{ days: NoDutyEntry[] }>(
    effectiveShiftingId ? `/api/attendance/no-duty?shiftingId=${effectiveShiftingId}&internId=${internId}` : null,
    fetcher,
  );

  function closePanel() {
    setPanel(null);
    setReason("");
    setScope("INTERN");
    setEndDate("");
  }

  async function submit() {
    if (!panel || !reason.trim() || !effectiveShiftingId || !data) return;
    setIsSubmitting(true);
    try {
      const isExcuse = panel.kind === "excuse";
      const res = await fetch(isExcuse ? "/api/attendance/excuse" : "/api/attendance/no-duty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isExcuse
            ? { internId, shiftingId: effectiveShiftingId, date: panel.date, reason }
            : {
                scope,
                internId: scope === "INTERN" ? internId : undefined,
                schoolId: scope === "SCHOOL" ? data.intern.schoolId : undefined,
                startDate: panel.date,
                endDate: endDate || undefined,
                reason,
              },
        ),
      });
      const result = await res.json();
      if (!res.ok) {
        const firstFieldError = result.fieldErrors ? Object.values<string[]>(result.fieldErrors)[0]?.[0] : null;
        toast.error(firstFieldError ?? result.error ?? "Could not save.");
        return;
      }
      toast.success(
        isExcuse
          ? "Marked as excused."
          : result.created
            ? `Marked ${result.created} day${result.created > 1 ? "s" : ""} as no class / duty.`
            : "Those days were already marked.",
      );
      closePanel();
      await Promise.all([mutate(), mutateNoDuty()]);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeNoDuty(entry: NoDutyEntry) {
    if (!confirm(`Remove the no class / duty mark for ${entry.date.slice(0, 10)} (${entry.label})?`)) return;
    const res = await fetch(`/api/attendance/no-duty/${entry.id}`, { method: "DELETE" });
    if (!res.ok) {
      const result = await res.json().catch(() => ({}));
      toast.error(result.error ?? "Could not remove the mark.");
      return;
    }
    toast.success("Removed.");
    await Promise.all([mutate(), mutateNoDuty()]);
  }

  const absentRows = data?.rows.filter((r) => r.status === "ABSENT") ?? [];
  const scopes: Scope[] = data?.viewerRole === "ADMIN" ? ["INTERN", "SCHOOL", "ALL"] : ["INTERN", "SCHOOL"];

  return (
    <div className="flex flex-col gap-4">
      {shiftings.length > 0 && (
        <ShiftingTabs shiftings={shiftings} selectedId={effectiveShiftingId} onSelect={setShiftingId} />
      )}

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data.summary.present} Present · {data.summary.absent} Absent · {data.summary.incomplete} Incomplete ·{" "}
            {data.summary.late} Late
            {data.summary.excused > 0 && <> · {data.summary.excused} Excused</>}
            {data.summary.noDuty > 0 && <> · {data.summary.noDuty} No duty</>}
          </p>

          <AttendanceAlertBanner
            audience="staff"
            level={data.thresholds.level}
            absences={data.summary.absent}
            earlyWarning={data.thresholds.absenceEarlyWarning}
            dropLimit={data.thresholds.dropEligibleAbove}
          />

          <DtrTable rows={data.rows} />

          <div className="rounded-lg border p-3">
            <h4 className="mb-2 text-sm font-semibold">Absent days</h4>
            {panel ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">
                  {panel.kind === "excuse" ? "Mark as Excused" : "Mark No Class / Duty"}
                </p>

                {panel.kind === "noduty" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label>Applies to</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {scopes.map((option) => (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={scope === option}
                            onClick={() => setScope(option)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${
                              scope === option ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {option === "SCHOOL" ? `Whole school (${data.intern.schoolName})` : SCOPE_LABEL[option]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="nd-start">From</Label>
                        <Input
                          id="nd-start"
                          type="date"
                          value={panel.date}
                          onChange={(e) => setPanel({ kind: "noduty", date: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="nd-end">To (optional)</Label>
                        <Input id="nd-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                      </div>
                    </div>
                  </>
                )}
                {panel.kind === "excuse" && <p className="text-xs text-muted-foreground">Date: {panel.date}</p>}

                <Label htmlFor="dtr-reason" className="sr-only">
                  Reason
                </Label>
                <Textarea
                  id="dtr-reason"
                  placeholder={
                    panel.kind === "excuse" ? "e.g. Medical certificate presented" : "e.g. Class suspension, Typhoon Tino"
                  }
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" disabled={!reason.trim() || isSubmitting} onClick={submit}>
                    {isSubmitting ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={closePanel}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {absentRows.slice(0, 8).map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm">
                    <span>
                      {r.date} ({r.day})
                    </span>
                    <span className="flex gap-3 text-xs font-medium text-secondary">
                      <button type="button" onClick={() => setPanel({ kind: "excuse", date: r.date })}>
                        Excuse
                      </button>
                      <button type="button" onClick={() => setPanel({ kind: "noduty", date: r.date })}>
                        No class / duty
                      </button>
                    </span>
                  </div>
                ))}
                {absentRows.length === 0 && <p className="text-xs text-muted-foreground">No unexcused absences.</p>}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 self-start"
                  onClick={() => setPanel({ kind: "noduty", date: new Date().toISOString().slice(0, 10) })}
                >
                  <CalendarOff /> Mark a No Class / Duty date
                </Button>
              </div>
            )}
          </div>

          {(noDutyData?.days.length ?? 0) > 0 && (
            <div className="rounded-lg border p-3">
              <h4 className="mb-2 text-sm font-semibold">No class / duty days</h4>
              <ul className="flex flex-col gap-1 text-sm">
                {noDutyData!.days.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2">
                    <span>
                      {entry.date.slice(0, 10)} · {entry.reason}
                      <span className="ml-1 text-xs text-muted-foreground">({entry.label})</span>
                    </span>
                    {entry.canRemove && (
                      <button
                        type="button"
                        aria-label="Remove no class / duty mark"
                        onClick={() => removeNoDuty(entry)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
