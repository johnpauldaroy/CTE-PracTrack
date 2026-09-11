"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { SupervisorFormSheet } from "@/components/admin/accounts/supervisor-form-sheet";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SupervisorRow {
  id: string;
  department: string;
  user: { name: string; email: string };
  school: { name: string } | null;
}

export function SupervisorsAccountsTab() {
  const { data, isLoading, mutate } = useSWR<{ supervisors: SupervisorRow[] }>(
    "/api/accounts/supervisors",
    fetcher,
  );
  const [sheetMode, setSheetMode] = useState<{ mode: "add" } | { mode: "edit"; id: string } | null>(null);

  async function handleDelete(supervisor: SupervisorRow) {
    if (!confirm(`Remove ${supervisor.user.name}'s account?`)) return;
    const res = await fetch(`/api/accounts/supervisors/${supervisor.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove account.");
      return;
    }
    toast.success("Account removed.");
    mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setSheetMode({ mode: "add" })}>+ Add Supervisor</Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>School Assigned</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.supervisors.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.user.name}</TableCell>
                  <TableCell>{s.user.email}</TableCell>
                  <TableCell>{s.department}</TableCell>
                  <TableCell>
                    {s.school ? s.school.name : <span className="text-warning font-medium">Not yet assigned</span>}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => setSheetMode({ mode: "edit", id: s.id })}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(s)}>
                      Delete
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
        </div>
      )}

      <SupervisorFormSheet
        mode={sheetMode}
        onOpenChange={(open) => !open && setSheetMode(null)}
        onSaved={() => mutate()}
      />
    </div>
  );
}
