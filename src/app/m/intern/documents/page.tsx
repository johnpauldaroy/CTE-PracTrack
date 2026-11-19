"use client";
import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatManila } from "@/lib/timezone";
import { LessonPlanBadge, type LessonPlanStatus } from "@/components/lesson-plan-badge";
import { ProgressReportsSection } from "@/components/mobile/intern/progress-reports-section";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
interface DocumentRow {
  id: string;
  type: string;
  originalFilename: string;
}
interface SessionRow {
  id: string;
  sessionNumber: number;
  subject: string;
  lessonPlanStatus: LessonPlanStatus;
  lessonPlanDueDate: string | null;
  lessonPlanReturnNote: string | null;
  documents: DocumentRow[];
}
interface EndSubmissionRow {
  id: string;
  type: EndType;
  originalFilename: string;
  uploadedAt: string;
}
type EndType = "NARRATIVE_REPORT" | "TEACHING_PORTFOLIO";

export default function InternDocumentsPage() {
  const { data, mutate } = useSWR<{ sessions: SessionRow[]; endSubmissions: EndSubmissionRow[] }>("/api/documents", fetcher);
  const [busy, setBusy] = useState("");

  async function upload(sessionId: string, file: File | undefined) {
    if (!file) return;
    setBusy(sessionId);
    const form = new FormData();
    form.set("sessionId", sessionId);
    form.set("type", "LESSON_PLAN");
    form.set("file", file);
    try {
      const response = await fetch("/api/documents", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) return toast.error(result.error ?? "Upload failed.");
      toast.success("Lesson plan submitted to your cooperating teacher.");
      mutate();
    } catch {
      toast.error("No connection. Uploads need you to be online.");
    } finally {
      setBusy("");
    }
  }

  async function view(doc: DocumentRow) {
    const response = await fetch(`/api/documents/${doc.id}/url?kind=session`);
    const result = await response.json();
    if (response.ok) window.open(result.url, "_blank", "noopener,noreferrer");
    else toast.error(result.error);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="font-heading text-xl font-bold">Documents</h1>
        <p className="text-sm text-muted-foreground">PDF, JPG or PNG, up to 10 MB.</p>
      </div>

      <ProgressReportsSection />

      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Lesson plans</h2>
      {data?.sessions.length ? (
        data.sessions.map((session) => {
          const doc = session.documents.find((item) => item.type === "LESSON_PLAN");
          const locked = session.lessonPlanStatus === "APPROVED";
          return (
            <article key={session.id} className="rounded-xl border bg-card p-4">
              <h3 className="font-semibold">
                Session {session.sessionNumber}: {session.subject}
              </h3>
              <div className="mt-2">
                <LessonPlanBadge status={session.lessonPlanStatus} dueDate={session.lessonPlanDueDate} />
              </div>
              {session.lessonPlanStatus === "RETURNED" && session.lessonPlanReturnNote && (
                <p className="mt-1 text-sm text-destructive">Revision needed: {session.lessonPlanReturnNote}</p>
              )}
              <div className="mt-3 flex items-center justify-between gap-2">
                {doc ? (
                  <button onClick={() => view(doc)} className="max-w-44 truncate text-xs text-primary underline">
                    {doc.originalFilename}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">No file yet</span>
                )}
                {locked ? (
                  <span className="text-xs text-muted-foreground">Approved</span>
                ) : (
                  <label className="cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium">
                    {busy === session.id ? "Uploading…" : doc ? "Replace" : "Upload"}
                    <input
                      className="sr-only"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      disabled={!!busy}
                      onChange={(event) => {
                        const input = event.currentTarget;
                        const file = input.files?.[0];
                        input.value = "";
                        void upload(session.id, file);
                      }}
                    />
                  </label>
                )}
              </div>
            </article>
          );
        })
      ) : (
        <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
          Lesson plans appear after a teaching session is assigned.
        </p>
      )}
      <EndTermUpload submissions={data?.endSubmissions ?? []} onUploaded={() => mutate()} />
    </div>
  );
}

const END_LABEL: Record<EndType, string> = { NARRATIVE_REPORT: "Narrative Report", TEACHING_PORTFOLIO: "Teaching Portfolio" };

// Each slot tracks its own busy state and shows the file on record for that type only.
function EndTermUpload({ submissions, onUploaded }: { submissions: EndSubmissionRow[]; onUploaded: () => void }) {
  const [busy, setBusy] = useState<EndType | null>(null);
  async function upload(type: EndType, input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setBusy(type);
    const form = new FormData();
    form.set("type", type);
    form.set("file", file);
    try {
      const response = await fetch("/api/documents/end-term", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) return toast.error(result.error ?? "Upload failed.");
      toast.success(`${END_LABEL[type]} uploaded.`);
      onUploaded();
    } catch {
      toast.error("No connection. Uploads need you to be online.");
    } finally {
      setBusy(null);
    }
  }
  async function view(id: string) {
    const response = await fetch(`/api/documents/${id}/url?kind=end`);
    const result = await response.json();
    if (response.ok) window.open(result.url, "_blank", "noopener,noreferrer");
    else toast.error(result.error);
  }
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="font-semibold">End-of-Term Submissions</h2>
      {(["NARRATIVE_REPORT", "TEACHING_PORTFOLIO"] as const).map((type) => {
        const doc = submissions.find((item) => item.type === type);
        return (
          <div key={type} className="mt-3 flex items-center justify-between gap-2 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="text-sm">{END_LABEL[type]}</p>
              {doc ? (
                <>
                  <button onClick={() => view(doc.id)} className="block max-w-48 truncate text-xs text-primary underline">
                    {doc.originalFilename}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {formatManila(new Date(doc.uploadedAt), "MMM d, yyyy h:mm a")}
                  </p>
                </>
              ) : (
                <Badge variant="secondary">Not submitted</Badge>
              )}
            </div>
            <label className="shrink-0 cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium">
              {busy === type ? "Uploading…" : doc ? "Replace" : "Upload"}
              <input
                className="sr-only"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={!!busy}
                onChange={(event) => upload(type, event.currentTarget)}
              />
            </label>
          </div>
        );
      })}
    </section>
  );
}
