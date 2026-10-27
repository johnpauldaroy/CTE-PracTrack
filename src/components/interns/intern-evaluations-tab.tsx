"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ShiftingTabs } from "@/components/shifting-tabs";
import { formatScore, useInternSessions } from "@/components/interns/intern-sessions-tab";
import { formatManila } from "@/lib/timezone";

/** Submitted evaluations with the per-criterion breakdown and CT comments (read-only). */
export function InternEvaluationsTab({ internId }: { internId: string }) {
  const { shiftings, shiftingId, setShiftingId, data, error, isLoading } = useInternSessions(internId);
  const evaluated = data?.sessions.filter((session) => session.evaluation) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <ShiftingTabs shiftings={shiftings} selectedId={shiftingId} onSelect={setShiftingId} />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : evaluated.length === 0 ? (
        <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          No submitted evaluations in this shifting yet.
        </p>
      ) : (
        evaluated.map((session) => {
          const evaluation = session.evaluation!;
          return (
            <article key={session.id} className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {session.type === "FINAL_DEMO" ? "Final Demo" : `Session ${session.sessionNumber}`}: {session.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatManila(new Date(session.date), "MMM d, yyyy")}</p>
                </div>
                <p className="text-lg font-semibold">{formatScore(evaluation.overallScore)}</p>
              </div>

              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 text-left font-medium">Criterion</th>
                    <th className="py-1 text-right font-medium">Mean (1–5)</th>
                    <th className="py-1 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluation.criteria.map((criterion) => (
                    <tr key={criterion.name} className="border-t">
                      <td className="py-1">
                        {criterion.name} <span className="text-muted-foreground">({criterion.weightPercent}%)</span>
                      </td>
                      <td className="py-1 text-right">{criterion.mean.toFixed(2)}</td>
                      <td className="py-1 text-right">
                        {criterion.weightedPercent.toFixed(2)} / {criterion.weightPercent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {evaluation.commendable && (
                <div>
                  <p className="text-xs font-medium">Commendable</p>
                  <p className="text-sm whitespace-pre-line text-muted-foreground">{evaluation.commendable}</p>
                </div>
              )}
              {evaluation.areasForImprovement && (
                <div>
                  <p className="text-xs font-medium">Areas for improvement</p>
                  <p className="text-sm whitespace-pre-line text-muted-foreground">{evaluation.areasForImprovement}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Electronically signed by {evaluation.submittedBy} ·{" "}
                {formatManila(new Date(evaluation.submittedAt), "MMM d, yyyy h:mm a")}
              </p>
            </article>
          );
        })
      )}
    </div>
  );
}
