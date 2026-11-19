"use client";

import { useState } from "react";
import useSWR from "swr";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShiftingTabs, type ShiftingOption } from "@/components/shifting-tabs";
import { DtrTable, type DtrRowData } from "@/components/dtr-table";
import { AttendanceAlertBanner, type AttendanceLevel } from "@/components/attendance-alert-banner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DtrResponse {
  intern: { id: string };
  rows: DtrRowData[];
  summary: { present: number; absent: number; incomplete: number; late: number; excused: number; noDuty: number };
  thresholds: { absenceEarlyWarning: number; dropEligibleAbove: number; level: AttendanceLevel };
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
            {dtrData.summary.excused > 0 && <> · {dtrData.summary.excused} Excused</>}
            {dtrData.summary.noDuty > 0 && <> · {dtrData.summary.noDuty} No duty</>}
          </p>

          <AttendanceAlertBanner
            audience="intern"
            level={dtrData.thresholds.level}
            absences={dtrData.summary.absent}
            earlyWarning={dtrData.thresholds.absenceEarlyWarning}
            dropLimit={dtrData.thresholds.dropEligibleAbove}
          />

          <DtrTable rows={dtrData.rows} />
        </>
      )}
    </div>
  );
}
