"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShiftingTabs } from "@/components/shifting-tabs";
import { useShiftingSelection } from "@/components/interns/use-shifting-selection";
import { formatManila } from "@/lib/timezone";

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Unable to load documents.");
    return data;
  });

interface FileRow { id: string; type: string; originalFilename: string | null; uploadedAt: string | null }
interface DocumentsResponse {
  sessions: { id: string; sessionNumber: number; subject: string; date: string; documents: FileRow[] }[];
  endSubmissions: FileRow[];
}

const SESSION_TYPES = [
  ["LESSON_PLAN", "Lesson Plan"],
  ["PROGRESS_REPORT", "Progress Report"],
] as const;
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
                {SESSION_TYPES.map(([type, label]) => (
                  <FileLine key={type} label={label} kind="session" file={session.documents.find((d) => d.type === type)} />
                ))}
              </section>
            ))
          )}
        </>
      ) : null}
    </div>
  );
}
