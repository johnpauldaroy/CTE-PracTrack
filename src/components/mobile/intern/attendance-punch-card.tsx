"use client";

import { useState } from "react";
import useSWR from "swr";
import { MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TodayAttendance {
  record: {
    timeIn: string | null;
    timeOut: string | null;
    status: string;
  } | null;
  effectiveConfig: { timeInCutoff: string; timeOutStart: string };
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
        // Out-of-range / after-cutoff / already-punched messages surface verbatim —
        // no optimistic success state is ever shown before the server confirms.
        toast.error(result.error ?? "Could not record attendance.");
        return;
      }
      toast.success(kind === "time-in" ? "Time In recorded." : "Time Out recorded.");
      mutate();
    } finally {
      setState("idle");
    }
  }

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl border bg-muted/40" />;
  }

  const record = data?.record;
  const isBusy = state !== "idle";

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 font-semibold">Attendance — Today</h3>

      <div className="flex flex-col gap-2">
        {record?.timeIn ? (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="text-sm font-medium">
              Time In — {new Date(record.timeIn).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} —{" "}
              {data?.schoolName}
            </span>
          </div>
        ) : (
          <Button onClick={() => handlePunch("time-in")} disabled={isBusy} className="w-full">
            {isBusy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> {state === "locating" ? "Getting location…" : "Recording…"}
              </>
            ) : (
              <>
                <MapPin className="size-4" /> Time In
              </>
            )}
          </Button>
        )}

        {record?.timeIn && !record.timeOut && (
          <Button onClick={() => handlePunch("time-out")} disabled={isBusy} className="w-full">
            {isBusy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> {state === "locating" ? "Getting location…" : "Recording…"}
              </>
            ) : (
              <>
                <MapPin className="size-4" /> Time Out
              </>
            )}
          </Button>
        )}

        {record?.timeOut && (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="text-sm font-medium">
              Time Out — {new Date(record.timeOut).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Location is captured only at the moment you tap Time In or Time Out — the app does not track
        your location in the background.
      </p>
    </div>
  );
}
