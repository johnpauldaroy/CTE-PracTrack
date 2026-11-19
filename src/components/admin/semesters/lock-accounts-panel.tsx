"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Lock, Unlock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ROLES = [
  { key: "STUDENT_INTERN", label: "Interns" },
  { key: "COOPERATING_TEACHER", label: "Cooperating teachers" },
  { key: "SUPERVISOR", label: "Supervisors" },
] as const;
type RoleKey = (typeof ROLES)[number]["key"];

interface Preview {
  lock: { counts: Partial<Record<RoleKey, number>>; total: number };
  unlock: { counts: Partial<Record<RoleKey, number>>; total: number };
}

/**
 * End-of-semester housekeeping: lock (or unlock) other users' accounts by role and,
 * optionally, by school. Locking blocks sign-in only; no record is changed or deleted.
 */
export function LockAccountsPanel() {
  const [roles, setRoles] = useState<RoleKey[]>(["STUDENT_INTERN"]);
  const [schoolId, setSchoolId] = useState("");
  const [reason, setReason] = useState("Semester ended");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: schoolsData } = useSWR<{ schools: { id: string; name: string }[] }>("/api/schools", fetcher);

  const body = (action: "preview" | "lock" | "unlock") => ({
    action,
    roles,
    schoolId: schoolId || undefined,
    reason: reason || undefined,
  });

  useEffect(() => {
    let cancelled = false;
    if (!roles.length) return;
    fetch("/api/accounts/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preview", roles, schoolId: schoolId || undefined }),
    })
      .then((res) => res.json())
      .then((data) => !cancelled && data.lock && setPreview(data))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [roles, schoolId]);

  async function run(action: "lock" | "unlock") {
    const count = action === "lock" ? preview?.lock.total : preview?.unlock.total;
    if (!count) return;
    if (!confirm(`${action === "lock" ? "Lock" : "Unlock"} ${count} account${count > 1 ? "s" : ""}?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/accounts/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body(action)),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.fieldErrors?.reason?.[0] ?? result.error ?? "Could not change the accounts.");
        return;
      }
      toast.success(`${result.changed} account${result.changed === 1 ? "" : "s"} ${action === "lock" ? "locked" : "unlocked"}.`);
      const refreshed = await fetch("/api/accounts/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body("preview")),
      }).then((r) => r.json());
      if (refreshed.lock) setPreview(refreshed);
    } finally {
      setBusy(false);
    }
  }

  const summarize = (counts: Partial<Record<RoleKey, number>>) =>
    ROLES.filter((role) => roles.includes(role.key))
      .map((role) => `${counts[role.key] ?? 0} ${role.label.toLowerCase()}`)
      .join(", ");

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">End of semester: lock accounts</h2>
          <p className="text-sm text-muted-foreground">
            Locked users cannot sign in and are signed out on their next action. Nothing is deleted; unlock them when the next
            semester starts. Admin accounts are never locked.
          </p>
        </div>

        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Roles to include</legend>
          {ROLES.map((role) => (
            <label
              key={role.key}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                roles.includes(role.key) ? "border-primary bg-primary/10" : "text-muted-foreground"
              }`}
            >
              <input
                type="checkbox"
                checked={roles.includes(role.key)}
                onChange={() =>
                  setRoles((current) => (current.includes(role.key) ? current.filter((r) => r !== role.key) : [...current, role.key]))
                }
              />
              {role.label}
            </label>
          ))}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lock-school">School (optional)</Label>
            <select
              id="lock-school"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="">All schools</option>
              {schoolsData?.schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lock-reason">Reason</Label>
            <Input id="lock-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>

        <p className="text-sm">
          {preview && roles.length ? (
            <>
              Will lock <strong>{summarize(preview.lock.counts) || "0 accounts"}</strong>. Currently locked:{" "}
              <strong>{preview.unlock.total}</strong>.
            </>
          ) : (
            <span className="text-muted-foreground">Pick at least one role.</span>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" disabled={busy || !preview?.lock.total || !reason.trim()} onClick={() => run("lock")}>
            <Lock /> Lock accounts
          </Button>
          <Button variant="outline" disabled={busy || !preview?.unlock.total} onClick={() => run("unlock")}>
            <Unlock /> Unlock {preview?.unlock.total ? `${preview.unlock.total} locked` : ""}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
