"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatManila } from "@/lib/timezone";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface EnrollmentRequest {
  id: string;
  user: { name: string; email: string; phone: string | null; createdAt: string };
  assignedSchool: { id: string; name: string };
  section: { name: string } | null;
  course: string;
  yearLevel: string;
}

export const ENROLLMENTS_KEY = "/api/enrollments";

/** Interns who verified their email and wait for the school's supervisor (or the CTE office) to confirm them. */
export function EnrollmentRequests({ showSchool = true, emptyText }: { showSchool?: boolean; emptyText?: string }) {
  const { data, isLoading, mutate } = useSWR<{ requests: EnrollmentRequest[] }>(ENROLLMENTS_KEY, fetcher);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, body: { action: "approve" } | { action: "reject"; reason: string }) {
    setBusy(id);
    try {
      const res = await fetch(`/api/enrollments/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.fieldErrors?.reason?.[0] ?? result.error ?? "Could not save your decision.");
        return;
      }
      toast.success(body.action === "approve" ? "Enrollment confirmed." : "Request declined.");
      setRejecting(null);
      setReason("");
      await mutate();
    } catch {
      toast.error("No connection. Confirmations need you to be online.");
    } finally {
      setBusy(null);
    }
  }

  const requests = data?.requests ?? [];
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!requests.length) {
    return <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">{emptyText ?? "No enrollment requests waiting."}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {requests.map((request) => (
        <li key={request.id} className="rounded-xl border bg-card p-4">
          <p className="font-semibold">{request.user.name}</p>
          <p className="text-sm text-muted-foreground">
            {request.section?.name ?? request.course} · {request.course}, {request.yearLevel}
            {showSchool && ` · ${request.assignedSchool.name}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {request.user.email}
            {request.user.phone && ` · ${request.user.phone}`}
          </p>
          <p className="text-xs text-muted-foreground">
            Registered {formatManila(new Date(request.user.createdAt), "MMM d, yyyy h:mm a")}
          </p>

          {rejecting === request.id ? (
            <div className="mt-3 flex flex-col gap-2">
              <Textarea
                aria-label="Reason for declining"
                placeholder="Why is this request declined?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" disabled={!reason.trim() || busy === request.id} onClick={() => decide(request.id, { action: "reject", reason })}>
                  Decline
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <Button size="sm" disabled={busy === request.id} onClick={() => decide(request.id, { action: "approve" })}>
                <Check /> Confirm
              </Button>
              <Button size="sm" variant="outline" disabled={busy === request.id} onClick={() => setRejecting(request.id)}>
                <X /> Decline
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
