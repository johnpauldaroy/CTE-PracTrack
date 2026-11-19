"use client";

import { useState } from "react";
import Link from "next/link";
import { mutate } from "swr";
import { toast } from "sonner";
import { Check, FileText, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SESSIONS_KEY, type SessionRow } from "@/components/mobile/session-list";

/**
 * The cooperating teacher's controls on a session card: view the lesson plan,
 * Approve it (or Return it with a note), then Evaluate. Evaluate stays locked
 * until the plan is approved, and the server enforces the same rule.
 */
export function CtSessionActions({ session }: { session: SessionRow }) {
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (session.status !== "ASSIGNED") return null;

  const lessonPlan = session.documents.find((doc) => doc.type === "LESSON_PLAN");

  async function viewPlan() {
    if (!lessonPlan) return;
    const res = await fetch(`/api/documents/${lessonPlan.id}/url?kind=session`);
    const data = await res.json();
    if (res.ok) window.open(data.url, "_blank", "noopener,noreferrer");
    else toast.error(data.error ?? "Could not open the file.");
  }

  async function review(body: { action: "approve" } | { action: "return"; note: string }) {
    setBusy(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/lesson-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.fieldErrors?.note?.[0] ?? data.error ?? "Could not save your review.");
        return;
      }
      toast.success(body.action === "approve" ? "Lesson plan approved." : "Lesson plan returned.");
      setReturning(false);
      setNote("");
      await mutate(SESSIONS_KEY);
    } finally {
      setBusy(false);
    }
  }

  const approved = session.lessonPlanStatus === "APPROVED";

  return (
    <div className="mt-3 flex flex-col gap-2">
      {lessonPlan && (
        <Button variant="outline" size="sm" onClick={viewPlan}>
          <FileText /> View lesson plan
        </Button>
      )}

      {session.lessonPlanStatus === "SUBMITTED" &&
        (returning ? (
          <div className="flex flex-col gap-2">
            <Textarea
              aria-label="What needs to change"
              placeholder="What does the intern need to fix?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" disabled={busy || !note.trim()} onClick={() => review({ action: "return", note })}>
                Send back
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReturning(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" disabled={busy} onClick={() => review({ action: "approve" })}>
              <Check /> Approve
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setReturning(true)}>
              <Undo2 /> Return
            </Button>
          </div>
        ))}

      {approved ? (
        <Button size="sm" render={<Link href={`/m/ct/sessions/${session.id}/evaluate`} />}>
          Evaluate
        </Button>
      ) : (
        <>
          <Button size="sm" disabled>
            Evaluate
          </Button>
          <p className="text-xs text-muted-foreground">Approve the lesson plan first to unlock the evaluation.</p>
        </>
      )}
    </div>
  );
}
