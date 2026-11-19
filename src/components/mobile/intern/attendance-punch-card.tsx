"use client";

import { useState } from "react";
import useSWR from "swr";
import { MapPin, CheckCircle2, Loader2, CalendarOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatManila } from "@/lib/timezone";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PunchAction {
  enabled: boolean;
  period: "AM" | "PM" | null;
  reason: string | null;
}

interface TodayAttendance {
  record: {
    status: string;
    amTimeIn: string | null;
    amTimeOut: string | null;
    pmTimeIn: string | null;
    pmTimeOut: string | null;
  } | null;
  effectiveConfig: { amTimeInCutoff: string; pmTimeInCutoff: string };
  noDuty: { reason: string } | null;
  actions: { timeIn: PunchAction; timeOut: PunchAction };
  schoolName: string;
}

type PunchState = "idle" | "locating" | "submitting";

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Your browser does not support location services."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

function time(value: string | null) {
  return value ? formatManila(new Date(value), "h:mm a") : null;
}

export function AttendancePunchCard() {
  const { data, isLoading, mutate } = useSWR<TodayAttendance>("/api/attendance/today", fetcher);
  const [state, setState] = useState<PunchState>("idle");

  async function handlePunch(kind: "time-in" | "time-out") {
    setState("locating");
    let position: GeolocationPosition;
    try {
      position = await getPosition();
    } catch {
      toast.error(
        "Location access is required to record attendance. Please allow location permission and try again.",
      );
      setState("idle");
      return;
    }

    setState("submitting");
    try {
      // The server decides AM or PM from the clock and today's punches; the device only sends coordinates.
      const res = await fetch(`/api/attendance/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        // Out-of-range / not-yet-open / already-punched messages surface verbatim —
        // no optimistic success state is ever shown before the server confirms.
        toast.error(result.error ?? "Could not record attendance.");
        mutate();
        return;
      }
      toast.success(kind === "time-in" ? "Time In recorded." : "Time Out recorded.");
      mutate();
    } catch {
      // Writes need a live connection; nothing is queued for later (a queued punch would defeat the geofence).
      toast.error("No connection. Attendance can only be recorded while you are online.");
    } finally {
      setState("idle");
    }
  }

  if (isLoading || !data) {
    return <div className="h-40 animate-pulse rounded-xl border bg-muted/40" />;
  }

  if (data.noDuty) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-3 font-semibold">Attendance — Today</h3>
        <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-3 text-sm">
          <CalendarOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">No class or duty today</p>
            <p className="text-muted-foreground">{data.noDuty.reason}</p>
            <p className="mt-1 text-xs text-muted-foreground">Time In and Time Out are locked for today.</p>
          </div>
        </div>
      </div>
    );
  }

  const record = data.record;
  const isBusy = state !== "idle";
  const { timeIn, timeOut } = data.actions;
  const hasOpenPunch =
    !!record && ((record.amTimeIn && !record.amTimeOut) || (record.pmTimeIn && !record.pmTimeOut));
  const hint = !timeIn.enabled && !timeOut.enabled ? (hasOpenPunch ? timeOut.reason : timeIn.reason) : null;

  const halves = [
    { label: "Morning", tIn: record?.amTimeIn ?? null, tOut: record?.amTimeOut ?? null },
    { label: "Afternoon", tIn: record?.pmTimeIn ?? null, tOut: record?.pmTimeOut ?? null },
  ];

  function renderPunchButton(kind: "time-in" | "time-out", action: PunchAction) {
    const label = kind === "time-in" ? "Time In" : "Time Out";
    return (
      <Button
        key={kind}
        onClick={() => handlePunch(kind)}
        disabled={isBusy}
        className="w-full"
        variant={kind === "time-in" ? "default" : "secondary"}
      >
        {isBusy ? (
          <>
            <Loader2 className="size-4 animate-spin" /> {state === "locating" ? "Getting location…" : "Recording…"}
          </>
        ) : (
          <>
            <MapPin className="size-4" /> {label}
            {action.period ? ` (${action.period})` : ""}
          </>
        )}
      </Button>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 font-semibold">Attendance — Today</h3>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {halves.map((half) => (
          <div key={half.label} className="rounded-lg border px-3 py-2 text-sm">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{half.label}</p>
            <p className="mt-1 flex items-center gap-1">
              {half.tIn && <CheckCircle2 className="size-3.5 text-success" />}
              <span className="text-muted-foreground">In</span> {time(half.tIn) ?? "—"}
            </p>
            <p className="flex items-center gap-1">
              {half.tOut && <CheckCircle2 className="size-3.5 text-success" />}
              <span className="text-muted-foreground">Out</span> {time(half.tOut) ?? "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {timeIn.enabled && renderPunchButton("time-in", timeIn)}
        {timeOut.enabled && renderPunchButton("time-out", timeOut)}
        {hint && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{hint}</p>}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {data.schoolName}. Location is captured only at the moment you tap Time In or Time Out — the app does not
        track your location in the background.
      </p>
    </div>
  );
}
