"use client";

import { useState } from "react";
import useSWR from "swr";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShiftingTabs, type ShiftingOption } from "@/components/shifting-tabs";
import { DtrTable } from "@/components/dtr-table";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DtrResponse {
  intern: { id: string };
  rows: { id: string; date: string; day: string; timeIn: string | null; timeOut: string | null; status: string; excuseReason: string | null }[];
  summary: { present: number; absent: number; incomplete: number; late: number; excused: number };
  thresholds: { absenceEarlyWarning: number; earlyWarningExceeded: boolean };
}

export default function InternAttendancePage() {
  const { data: shiftingsData } = useSWR<{ shiftings: ShiftingOption[] }>("/api/intern/shiftings", fetcher);
  const [selectedShiftingId, setSelectedShiftingId] = useState<string | null>(null);
  const defaultShifting =
    shiftingsData?.shiftings.find((shifting) => shifting.status === "ACTIVE") ??
    shiftingsData?.shiftings[0];
  const effectiveShiftingId =
    selectedShiftingId && shiftingsData?.shiftings.some((shifting) => shifting.id === selectedShiftingId)
      ? selectedShiftingId
      : (defaultShifting?.id ?? null);

  const { data: dtrData, isLoading } = useSWR<DtrResponse>(
    effectiveShiftingId ? `/api/intern/dtr?shiftingId=${effectiveShiftingId}` : null,
    fetcher,
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold">Attendance</h1>
        <Button variant="outline" size="sm">
          <Printer className="size-4" /> Print / Export
        </Button>
      </div>

      {shiftingsData && (
        <ShiftingTabs
          shiftings={shiftingsData.shiftings}
          selectedId={effectiveShiftingId}
          onSelect={setSelectedShiftingId}
        />
      )}

      {isLoading || !dtrData ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {dtrData.summary.present} Present · {dtrData.summary.absent} Absent ·{" "}
            {dtrData.summary.incomplete} Incomplete · {dtrData.summary.late} Late
          </p>

          {dtrData.thresholds.earlyWarningExceeded && (
            <div className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
              {dtrData.summary.absent} absences recorded. Early warning threshold is{" "}
              {dtrData.thresholds.absenceEarlyWarning}. Please speak with your supervisor.
            </div>
          )}

          <DtrTable rows={dtrData.rows} />
        </>
      )}
    </div>
  );
}
