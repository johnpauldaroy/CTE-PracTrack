"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SupervisorFormSheet } from "@/components/admin/accounts/supervisor-form-sheet";
import { SchoolChecklist } from "@/components/admin/accounts/school-checklist";
import { formatManila } from "@/lib/timezone";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { TablePager, usePaged } from "@/components/pagination";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SupervisorRow {
  id: string;
  user: { name: string; email: string; phone: string | null; status: string; createdAt: string };
  schools: { school: { id: string; name: string } }[];
}

export function SupervisorsAccountsTab() {
  const { data, isLoading, mutate } = useSWR<{ supervisors: SupervisorRow[] }>("/api/accounts/supervisors", fetcher);
  const { data: pendingData, mutate: mutatePending } = useSWR<{ supervisors: SupervisorRow[] }>(
    "/api/accounts/supervisors?status=pending",
    fetcher,
  );
  const [sheetMode, setSheetMode] = useState<{ mode: "add" } | { mode: "edit"; id: string } | null>(null);
  // Which pending supervisor is being approved, and the schools ticked for them.
  const [approving, setApproving] = useState<{ id: string; schoolIds: string[] } | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  async function handleDelete(supervisor: SupervisorRow, pending: boolean) {
    if (!confirm(pending ? `Reject ${supervisor.user.name}'s registration?` : `Remove ${supervisor.user.name}'s account?`)) return;
    const res = await fetch(`/api/accounts/supervisors/${supervisor.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove account.");
      return;
    }
    toast.success(pending ? "Registration rejected." : "Account removed.");
    mutate();
    mutatePending();
  }

  async function handleApprove() {
    if (!approving) return;
    setIsApproving(true);
    try {
      const res = await fetch(`/api/accounts/supervisors/${approving.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolIds: approving.schoolIds }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Could not approve the registration.");
        return;
      }
      toast.success("Supervisor approved.");
      setApproving(null);
      mutate();
      mutatePending();
    } finally {
      setIsApproving(false);
    }
  }

  const pending = pendingData?.supervisors ?? [];
  const activePaged = usePaged(data?.supervisors ?? [], 10);

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">
        Supervisors and faculty can register from the mobile app. New registrations wait below until you approve them
        and assign their school(s).
      </p>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pending Approval ({pending.length})</h2>
        <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.user.name}</TableCell>
                  <TableCell>{s.user.email}</TableCell>
                  <TableCell>{formatManila(new Date(s.user.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="flex justify-end gap-2 text-right">
                    <Button size="sm" onClick={() => setApproving({ id: s.id, schoolIds: [] })}>
                      <Check /> Approve
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(s, true)}>
                      <Trash2 /> Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No supervisors waiting for approval.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {approving && (
          <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
            <h3 className="font-semibold">Assign school(s) and approve</h3>
            <SchoolChecklist
              selected={approving.schoolIds}
              onChange={(schoolIds) => setApproving({ ...approving, schoolIds })}
            />
            <p className="text-xs text-muted-foreground">
              You can approve without a school and assign one later. The supervisor sees nothing until a school is assigned.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApprove} disabled={isApproving}>
                {isApproving ? "Approving…" : "Approve"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setApproving(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active Supervisors</h2>
          <Button onClick={() => setSheetMode({ mode: "add" })}>
            <Plus /> Add Supervisor
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Schools</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePaged.rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.user.name}
                      {s.user.status === "LOCKED" && <span className="ml-2 text-xs font-normal text-destructive">Locked</span>}
                    </TableCell>
                    <TableCell>{s.user.email}</TableCell>
                    <TableCell>
                      {s.schools.length ? (
                        s.schools.map((entry) => entry.school.name).join(", ")
                      ) : (
                        <span className="font-medium text-warning">Not yet assigned</span>
                      )}
                    </TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => setSheetMode({ mode: "edit", id: s.id })}>
                        <Pencil /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(s, false)}>
                        <Trash2 /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.supervisors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No supervisors yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePager {...activePaged} onPage={activePaged.setPage} />
          </div>
        )}
      </div>

      <SupervisorFormSheet
        mode={sheetMode}
        onOpenChange={(open) => !open && setSheetMode(null)}
        onSaved={() => mutate()}
      />
    </div>
  );
}
