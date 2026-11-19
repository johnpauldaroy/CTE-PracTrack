"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShiftingTabs } from "@/components/shifting-tabs";
import { useShiftingSelection } from "@/components/interns/use-shifting-selection";
import { formatManila } from "@/lib/timezone";
import { LessonPlanBadge, type LessonPlanStatus } from "@/components/lesson-plan-badge";
import { ProgressReportStateBadge, type ProgressReportState } from "@/components/progress-report-state";

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Unable to load documents.");
    return data;
  });

interface FileRow { id: string; type: string; originalFilename: string | null; uploadedAt: string | null }
interface DocumentsResponse {
  sessions: { id: string; sessionNumber: number; subject: string; date: string; lessonPlanStatus: LessonPlanStatus; documents: FileRow[] }[];
  endSubmissions: FileRow[];
}

interface ProgressPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  state: ProgressReportState;
  submission: { id: string; originalFilename: string; uploadedAt: string } | null;
}

async function openProgressReport(id: string) {
  const res = await fetch(`/api/progress-reports/${id}/url`);
  const data = await res.json();
  if (res.ok) window.open(data.url, "_blank", "noopener,noreferrer");
  else toast.error(data.error ?? "Could not open the file.");
}
const END_TYPES = [
  ["NARRATIVE_REPORT", "Narrative Report"],
  ["TEACHING_PORTFOLIO", "Teaching Portfolio"],
] as const;

async function openDocument(id: string, kind: "session" | "end") {
  const res = await fetch(`/api/documents/${id}/url?kind=${kind}`);
  const data = await res.json();
  if (res.ok) window.open(data.url, "_blank", "noopener,noreferrer");
  else toast.error(data.error ?? "Could not open the file.");
}

function FileLine({ label, file, kind }: { label: string; file: FileRow | undefined; kind: "session" | "end" }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
      <span>{label}</span>
      {file?.originalFilename ? (
        <button
          type="button"
          onClick={() => openDocument(file.id, kind)}
          className="max-w-48 truncate text-xs text-primary underline"
          title={file.uploadedAt ? `Uploaded ${formatManila(new Date(file.uploadedAt), "MMM d, yyyy h:mm a")}` : undefined}
        >
          {file.originalFilename}
        </button>
      ) : (
        <Badge variant="secondary">Missing</Badge>
      )}
    </div>
  );
}

/** Per-session lesson plans / progress reports plus end-of-term submissions, each viewable via a signed URL. */
export function InternDocumentsTab({ internId }: { internId: string }) {
  const { shiftings, shiftingId, setShiftingId, isLoading: shiftingsLoading } = useShiftingSelection();
  const { data: progressData } = useSWR<{ periods: ProgressPeriod[] }>(
    shiftingId ? `/api/interns/${internId}/progress-reports?shiftingId=${shiftingId}` : null,
    fetcher,
  );
  const { data, error, isLoading } = useSWR<DocumentsResponse>(
    shiftingId ? `/api/interns/${internId}/documents?shiftingId=${shiftingId}` : null,
    fetcher,
  );

  return (
    <div className="flex flex-col gap-3">
      <ShiftingTabs shiftings={shiftings} selectedId={shiftingId} onSelect={setShiftingId} />
      {shiftingsLoading || isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : error ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : data ? (
        <>
          <section className="rounded-lg border p-3">
            <h3 className="text-sm font-semibold">Progress Reports</h3>
            {!progressData?.periods.length ? (
              <p className="py-1.5 text-sm text-muted-foreground">No reporting periods set for this shifting.</p>
            ) : (
              progressData.periods.map((period) => (
                <div key={period.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span className="flex items-center gap-2">
                    {period.label} <ProgressReportStateBadge state={period.state} />
                  </span>
                  {period.submission ? (
                    <button
                      type="button"
                      onClick={() => openProgressReport(period.submission!.id)}
                      className="max-w-48 truncate text-xs text-primary underline"
                      title={`Uploaded ${formatManila(new Date(period.submission.uploadedAt), "MMM d, yyyy h:mm a")}`}
                    >
                      {period.submission.originalFilename}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Due {formatManila(new Date(period.dueDate), "MMM d")}</span>
                  )}
                </div>
              ))
            )}
          </section>
          <section className="rounded-lg border p-3">
            <h3 className="text-sm font-semibold">End-of-Term Submissions</h3>
            {END_TYPES.map(([type, label]) => (
              <FileLine key={type} label={label} kind="end" file={data.endSubmissions.find((s) => s.type === type)} />
            ))}
          </section>
          {data.sessions.length === 0 ? (
            <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              No teaching sessions in this shifting yet.
            </p>
          ) : (
            data.sessions.map((session) => (
              <section key={session.id} className="rounded-lg border p-3">
                <h3 className="text-sm font-semibold">
                  Session {session.sessionNumber}: {session.subject}
                </h3>
                <div className="py-1.5">
                  <LessonPlanBadge status={session.lessonPlanStatus} />
                </div>
                <FileLine label="Lesson Plan" kind="session" file={session.documents.find((d) => d.type === "LESSON_PLAN")} />
                {session.documents.some((d) => d.type === "PROGRESS_REPORT") && (
                  <FileLine
                    label="Progress Report (older, per-session)"
                    kind="session"
                    file={session.documents.find((d) => d.type === "PROGRESS_REPORT")}
                  />
                )}
              </section>
            ))
          )}
        </>
      ) : null}
    </div>
  );
}
