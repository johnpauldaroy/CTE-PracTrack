"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShiftingTabs } from "@/components/shifting-tabs";
import { useShiftingSelection } from "@/components/interns/use-shifting-selection";
import { formatManila } from "@/lib/timezone";

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Unable to load sessions.");
    return data;
  });

export interface InternSessionsResponse {
  shifting: { requiredTeachingSessions: number; requiredFinalDemos: number };
  sessions: {
    id: string;
    sessionNumber: number;
    date: string;
    subject: string;
    gradeSection: string;
    topic: string;
    type: "REGULAR" | "FINAL_DEMO";
    status: "ASSIGNED" | "EVALUATED";
    cooperatingTeacher: { user: { name: string } };
    documents: { id: string; type: string }[];
    evaluation: {
      overallScore: string;
      commendable: string | null;
      areasForImprovement: string | null;
      submittedAt: string;
      submittedBy: string;
      criteria: { name: string; weightPercent: number; mean: number; weightedPercent: number }[];
    } | null;
  }[];
}

/** Loads one intern's sessions for the selected shifting; shared by the Sessions and Evaluations tabs. */
export function useInternSessions(internId: string) {
  const selection = useShiftingSelection();
  const { data, error, isLoading } = useSWR<InternSessionsResponse>(
    selection.shiftingId ? `/api/interns/${internId}/sessions?shiftingId=${selection.shiftingId}` : null,
    fetcher,
  );
  return { ...selection, data, error: error as Error | undefined, isLoading: selection.isLoading || isLoading };
}

export function formatScore(score: string | number) {
  return `${Number(score).toFixed(2)}%`;
}

export function InternSessionsTab({ internId }: { internId: string }) {
  const { shiftings, shiftingId, setShiftingId, data, error, isLoading } = useInternSessions(internId);
  const regularEvaluated = data?.sessions.filter((s) => s.type === "REGULAR" && s.status === "EVALUATED").length ?? 0;
  const demosEvaluated = data?.sessions.filter((s) => s.type === "FINAL_DEMO" && s.status === "EVALUATED").length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <ShiftingTabs shiftings={shiftings} selectedId={shiftingId} onSelect={setShiftingId} />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Teaching sessions evaluated</p>
              <p className="text-lg font-semibold">
                {regularEvaluated}/{data.shifting.requiredTeachingSessions}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Final demo</p>
              <p className="text-lg font-semibold">
                {demosEvaluated}/{data.shifting.requiredFinalDemos}
              </p>
            </div>
          </div>
          {data.sessions.length === 0 ? (
            <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              No teaching sessions in this shifting yet.
            </p>
          ) : (
            data.sessions.map((session) => (
              <article key={session.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {session.type === "FINAL_DEMO" ? "Final Demo" : `Session ${session.sessionNumber}`}: {session.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatManila(new Date(session.date), "MMM d, yyyy")} · {session.gradeSection} · {session.topic}
                    </p>
                    <p className="text-xs text-muted-foreground">CT: {session.cooperatingTeacher.user.name}</p>
                  </div>
                  {session.evaluation ? (
                    <Badge className="bg-success text-success-foreground">{formatScore(session.evaluation.overallScore)}</Badge>
                  ) : (
                    <Badge variant="secondary">Awaiting evaluation</Badge>
                  )}
                </div>
              </article>
            ))
          )}
        </>
      ) : null}
    </div>
  );
}
