"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { AttendancePunchCard } from "@/components/mobile/intern/attendance-punch-card";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InternHomeData {
  intern: { name: string; schoolName: string };
  activeShifting: {
    name: "FIRST" | "SECOND";
    endDate: string;
    daysRemaining: number;
    requiredTeachingSessions: number;
    requiredFinalDemos: number;
    regularSessionsCompleted: number;
    finalDemosCompleted: number;
  } | null;
  stats: { absences: number; sessionsProgress: string; avgScore: number | null };
  flaggingConfig: { absenceEarlyWarning: number };
}

export default function InternHomePage() {
  const { data, isLoading } = useSWR<InternHomeData>("/api/intern/home", fetcher);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const firstName = data.intern.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const shifting = data.activeShifting;
  const sessionsRemaining = shifting
    ? Math.max(0, shifting.requiredTeachingSessions - shifting.regularSessionsCompleted)
    : 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {today} · {data.intern.schoolName}
        </p>
      </div>

      {shifting ? (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{shifting.name === "FIRST" ? "First Shifting" : "Second Shifting"}</h3>
            <Badge className="bg-success/15 text-success">Active</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {shifting.daysRemaining} days until end of shifting ({new Date(shifting.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })})
          </p>
          <p className="text-sm text-muted-foreground">
            Sessions: {shifting.regularSessionsCompleted} of {shifting.requiredTeachingSessions} completed
          </p>
          <p className="text-sm text-muted-foreground">
            Final Demo: {shifting.finalDemosCompleted > 0 ? "Conducted" : "Not yet conducted"}
          </p>

          {sessionsRemaining > 0 && shifting.daysRemaining > 0 && (
            <div className="mt-3 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
              You need {sessionsRemaining} more session{sessionsRemaining === 1 ? "" : "s"} in{" "}
              {shifting.daysRemaining} days to complete on time.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          No shifting is currently active.
        </div>
      )}

      <AttendancePunchCard />

      <div className="grid grid-cols-3 gap-3">
        <StatTile value={data.stats.absences} label="Absences" tone={data.stats.absences >= data.flaggingConfig.absenceEarlyWarning ? "warning" : undefined} />
        <StatTile value={data.stats.sessionsProgress} label="Sessions" />
        <StatTile value={data.stats.avgScore !== null ? `${data.stats.avgScore.toFixed(1)}%` : "—"} label="Avg Score" />
      </div>
    </div>
  );
}

function StatTile({ value, label, tone }: { value: string | number; label: string; tone?: "warning" }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className={tone === "warning" ? "text-xl font-bold text-warning" : "text-xl font-bold"}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
