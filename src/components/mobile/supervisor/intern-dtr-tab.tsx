"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ShiftingTabs, type ShiftingOption } from "@/components/shifting-tabs";
import { DtrTable } from "@/components/dtr-table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DtrResponse {
  intern: { id: string };
  rows: { id: string; date: string; day: string; timeIn: string | null; timeOut: string | null; status: string; excuseReason: string | null }[];
  summary: { present: number; absent: number; incomplete: number; late: number; excused: number };
  thresholds: { absenceEarlyWarning: number; dropEligibleAbove: number; earlyWarningExceeded: boolean };
}

export function InternDtrTab({ internId }: { internId: string }) {
  const { data: shiftingsData } = useSWR<{ shiftings: ShiftingOption[] }>("/api/shiftings/recent", fetcher);
  const [selectedShiftingId, setSelectedShiftingId] = useState<string | null>(null);
  const [excusingDate, setExcusingDate] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultShifting =
    shiftingsData?.shiftings.find((shifting) => shifting.status === "ACTIVE") ??
    shiftingsData?.shiftings[0];
  const effectiveShiftingId =
    selectedShiftingId && shiftingsData?.shiftings.some((shifting) => shifting.id === selectedShiftingId)
      ? selectedShiftingId
      : (defaultShifting?.id ?? null);

  const { data, isLoading, mutate } = useSWR<DtrResponse>(
    effectiveShiftingId ? `/api/interns/${internId}/dtr?shiftingId=${effectiveShiftingId}` : null,
    fetcher,
  );

  async function handleExcuse(date: string) {
    if (!reason.trim() || !effectiveShiftingId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/attendance/excuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internId, shiftingId: effectiveShiftingId, date, reason }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Could not mark as excused.");
        return;
      }
      toast.success("Marked as excused.");
      setExcusingDate(null);
      setReason("");
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {shiftingsData && (
        <ShiftingTabs shiftings={shiftingsData.shiftings} selectedId={effectiveShiftingId} onSelect={setSelectedShiftingId} />
      )}

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data.summary.present} Present · {data.summary.absent} Absent · {data.summary.incomplete} Incomplete
          </p>

          {data.thresholds.earlyWarningExceeded && (
            <div className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
              {data.summary.absent} absences. Early warning exceeded. Drop limit is {data.thresholds.dropEligibleAbove} days.
            </div>
          )}

          <DtrTable rows={data.rows} />

          <div className="rounded-lg border p-3">
            <h4 className="mb-2 text-sm font-semibold">Mark as Excused</h4>
            {excusingDate ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">Date: {excusingDate}</p>
                <Label htmlFor="excuse-reason" className="sr-only">
                  Reason / Reference
                </Label>
                <Textarea
                  id="excuse-reason"
                  placeholder="e.g. Medical certificate presented"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!reason.trim() || isSubmitting}
                    onClick={() => handleExcuse(excusingDate)}
                  >
                    {isSubmitting ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setExcusingDate(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {data.rows
                  .filter((r) => r.status === "ABSENT")
                  .slice(0, 5)
                  .map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setExcusingDate(r.date)}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <span>
                        {r.date} ({r.day})
                      </span>
                      <span className="text-xs font-medium text-secondary">Excuse this day</span>
                    </button>
                  ))}
                {data.rows.filter((r) => r.status === "ABSENT").length === 0 && (
                  <p className="text-xs text-muted-foreground">No unexcused absences to mark.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
