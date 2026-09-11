"use client";

import { useState } from "react";
import useSWR from "swr";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EditInternSheet } from "@/components/admin/accounts/edit-intern-sheet";
import { InternDetailSheet } from "@/components/admin/accounts/intern-detail-sheet";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InternRow {
  id: string;
  schoolNumber: string;
  course: string;
  user: { name: string; email: string };
  assignedSchool: { id: string; name: string };
}

export function InternsAccountsTab() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data, isLoading, mutate } = useSWR<{ interns: InternRow[] }>(
    `/api/accounts/interns?search=${encodeURIComponent(debouncedSearch)}`,
    fetcher,
  );

  async function handleDelete(intern: InternRow) {
    if (!confirm(`Remove ${intern.user.name}'s account? This deactivates the account; historical records are kept.`)) {
      return;
    }
    const res = await fetch(`/api/accounts/interns/${intern.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove account.");
      return;
    }
    toast.success("Account removed.");
    mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Intern accounts are added by their assigned school&apos;s supervisor. Use this page to view,
        edit, or remove accounts as needed.
      </p>

      <Input
        placeholder="Search by name or ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>School</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.interns.map((intern) => (
                <TableRow key={intern.id}>
                  <TableCell>{intern.schoolNumber}</TableCell>
                  <TableCell className="font-medium">{intern.user.name}</TableCell>
                  <TableCell className="text-secondary">{intern.course}</TableCell>
                  <TableCell>{intern.assignedSchool.name}</TableCell>
                  <TableCell className="flex justify-end gap-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => setViewingId(intern.id)}>
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingId(intern.id)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(intern)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data?.interns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No interns found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <EditInternSheet
        internId={editingId}
        onOpenChange={(open) => !open && setEditingId(null)}
        onSaved={() => mutate()}
      />
      <InternDetailSheet internId={viewingId} onOpenChange={(open) => !open && setViewingId(null)} />
    </div>
  );
}
