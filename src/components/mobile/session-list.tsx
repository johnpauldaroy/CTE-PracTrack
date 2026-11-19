"use client";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShowMoreButton, useShowMore } from "@/components/pagination";
import { LessonPlanBadge, type LessonPlanStatus } from "@/components/lesson-plan-badge";

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Unable to load sessions.");
    return data;
  });

interface SessionRow {
  id: string;
  sessionNumber: number;
  date: string;
  subject: string;
  gradeSection: string;
  topic: string;
  type: "REGULAR" | "FINAL_DEMO";
  status: "ASSIGNED" | "EVALUATED";
  notes: string | null;
  lessonPlanDueDate: string | null;
  lessonPlanStatus: LessonPlanStatus;
  lessonPlanReturnNote: string | null;
  intern: { user: { name: string } };
  cooperatingTeacher: { user: { name: string } };
  evaluation: { overallScore: string; commendable: string | null; areasForImprovement: string | null } | null;
  documents: { id: string; type: string }[];
}

export const SESSIONS_KEY = "/api/sessions";

export function SessionList({
  showIntern = false,
  actions,
}: {
  showIntern?: boolean;
  actions?: (session: SessionRow) => React.ReactNode;
}) {
  const { data, error, isLoading } = useSWR<{ sessions: SessionRow[] }>(SESSIONS_KEY, fetcher);
  const more = useShowMore(data?.sessions ?? [], 8);
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error) return <p className="text-sm text-destructive">{error.message}</p>;
  if (!data?.sessions.length) {
    return <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">No teaching sessions yet.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {more.rows.map((session) => (
        <article key={session.id} className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">
                Session {session.sessionNumber}: {session.subject}
              </p>
              <p className="text-sm text-muted-foreground">
                {showIntern ? `${session.intern.user.name} · ` : ""}
                {new Date(session.date).toLocaleDateString()} · {session.gradeSection}
              </p>
            </div>
            <Badge variant={session.status === "EVALUATED" ? "default" : "secondary"}>
              {session.status === "EVALUATED" ? "Evaluated" : "Awaiting"}
            </Badge>
          </div>
          <p className="mt-2 text-sm">{session.topic}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {session.type === "FINAL_DEMO" ? "Final Demo" : "Regular Teaching"}
          </p>

          {session.notes && (
            <p className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
              <span className="font-medium">Note from {showIntern ? "you" : "your cooperating teacher"}:</span>{" "}
              {session.notes}
            </p>
          )}

          <div className="mt-2">
            <LessonPlanBadge status={session.lessonPlanStatus} dueDate={session.lessonPlanDueDate} />
          </div>
          {session.lessonPlanStatus === "RETURNED" && session.lessonPlanReturnNote && (
            <p className="mt-1 text-sm text-destructive">Revision needed: {session.lessonPlanReturnNote}</p>
          )}
          {!showIntern && (session.lessonPlanStatus === "NOT_SUBMITTED" || session.lessonPlanStatus === "RETURNED") && (
            <p className="mt-1 text-xs text-muted-foreground">Upload it from the Documents tab.</p>
          )}

          {session.evaluation && (
            <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
              <strong>{Number(session.evaluation.overallScore).toFixed(2)}%</strong> reference evaluation score
              {session.evaluation.commendable && <p className="mt-1">Commendable: {session.evaluation.commendable}</p>}
              {session.evaluation.areasForImprovement && <p>For improvement: {session.evaluation.areasForImprovement}</p>}
            </div>
          )}
          {actions?.(session)}
        </article>
      ))}
      <ShowMoreButton hasMore={more.hasMore} remaining={more.remaining} onClick={more.showMore} />
    </div>
  );
}
export type { SessionRow };
