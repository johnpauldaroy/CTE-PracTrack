"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CtDetailSheet } from "@/components/admin/accounts/ct-detail-sheet";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PendingCt {
  id: string;
  user: { name: string; email: string; phone: string | null; createdAt: string };
  school: { name: string };
}

interface ActiveCt {
  id: string;
  user: { name: string; email: string };
  school: { name: string };
  assignedInterns: { user: { name: string } }[];
}

export function CtsAccountsTab() {
  const { data: pendingData, mutate: mutatePending } = useSWR<{ cts: PendingCt[] }>(
    "/api/accounts/cts/pending",
    fetcher,
  );
  const { data: activeData, isLoading, mutate: mutateActive } = useSWR<{ cts: ActiveCt[] }>(
    "/api/accounts/cts/active",
    fetcher,
  );
  const [viewingId, setViewingId] = useState<string | null>(null);

  async function handleApprove(ct: PendingCt) {
    const res = await fetch(`/api/accounts/cts/${ct.id}/approve`, { method: "POST" });
    if (!res.ok) {
      toast.error("Could not approve registration.");
      return;
    }
    toast.success(`${ct.user.name} approved.`);
    mutatePending();
    mutateActive();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete ${name}'s account?`)) return;
    const res = await fetch(`/api/accounts/cts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete account.");
      return;
    }
    toast.success("Account removed.");
    mutatePending();
    mutateActive();
  }

  const pending = pendingData?.cts ?? [];

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">
        Cooperating Teachers self-register from the mobile app. Pending registrations appear below for
        approval.
      </p>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pending Approval ({pending.length})</h2>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((ct) => (
                <TableRow key={ct.id} className="bg-accent/40">
                  <TableCell className="font-medium">{ct.user.name}</TableCell>
                  <TableCell>{ct.user.email}</TableCell>
                  <TableCell>{ct.user.phone}</TableCell>
                  <TableCell>{ct.school.name}</TableCell>
                  <TableCell>{new Date(ct.user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="flex flex-col items-end gap-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleApprove(ct)}
                      className="text-sm font-medium text-success hover:underline"
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ct.id, ct.user.name)}
                      className="text-sm font-medium text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {pending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    No pending registrations.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Active ({activeData?.cts.length ?? 0})</h2>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Interns Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeData?.cts.map((ct) => (
                  <TableRow key={ct.id}>
                    <TableCell className="font-medium">{ct.user.name}</TableCell>
                    <TableCell>{ct.user.email}</TableCell>
                    <TableCell>{ct.school.name}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {ct.assignedInterns.map((i) => i.user.name).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => setViewingId(ct.id)}>
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(ct.id, ct.user.name)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {activeData?.cts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No active Cooperating Teachers yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <CtDetailSheet ctId={viewingId} onOpenChange={(open) => !open && setViewingId(null)} />
    </div>
  );
}
