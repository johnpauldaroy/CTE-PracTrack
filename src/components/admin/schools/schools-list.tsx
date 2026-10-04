"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { useSchools, type SchoolListItem } from "@/lib/hooks/use-schools";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AddSchoolSheet } from "@/components/admin/schools/add-school-sheet";
import { DeleteSchoolDialog } from "@/components/admin/schools/delete-school-dialog";
import { ChevronDown, Eye, Plus, RotateCcw, Trash2 } from "lucide-react";
import { formatManila } from "@/lib/timezone";
import { cn } from "@/lib/utils";

export function SchoolsList() {
  const { schools, isLoading, mutate } = useSchools();
  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<SchoolListItem | null>(null);
  const [deletedVersion, setDeletedVersion] = useState(0);

  const secondary = schools.filter((s) => s.type === "SECONDARY");
  const elementary = schools.filter((s) => s.type === "ELEMENTARY");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold">Schools</h1>
        <Button onClick={() => setAddOpen(true)}><Plus /> Add School</Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <SchoolTable title="Secondary Schools" schools={secondary} onDelete={setDeleting} />
          <SchoolTable title="Elementary Schools" schools={elementary} onDelete={setDeleting} />
        </>
      )}

      <RecentlyDeletedSchools version={deletedVersion} onRestored={() => mutate()} />

      <AddSchoolSheet open={addOpen} onOpenChange={setAddOpen} onCreated={() => mutate()} />
      {deleting && (
        <DeleteSchoolDialog
          school={deleting}
          internCount={deleting._count.interns}
          open
          onOpenChange={(open) => !open && setDeleting(null)}
          onDeleted={() => {
            mutate();
            setDeletedVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

function SchoolTable({
  title,
  schools,
  onDelete,
}: {
  title: string;
  schools: SchoolListItem[];
  onDelete: (school: SchoolListItem) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">
        {title} ({schools.length})
      </h2>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School Name</TableHead>
              <TableHead>Municipality</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Interns</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.map((school) => (
              <TableRow key={school.id}>
                <TableCell className="font-medium">{school.name}</TableCell>
                <TableCell>{school.municipality}</TableCell>
                <TableCell className="capitalize">{school.type.toLowerCase()}</TableCell>
                <TableCell>{school._count.interns}</TableCell>
                <TableCell>
                  {school.supervisorProfile ? (
                    <span className="text-secondary">{school.supervisorProfile.user.name}</span>
                  ) : (
                    <span className="text-warning font-medium">Not yet assigned</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" render={<Link href={`/schools/${school.id}`} />}>
                      <Eye /> View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(school)}
                      aria-label={`Delete ${school.name}`}
                      title="Delete school"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {schools.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No schools in this category yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface DeletedSchool {
  id: string;
  name: string;
  type: "SECONDARY" | "ELEMENTARY";
  municipality: string;
  deletedAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/** Collapsible list of soft-deleted schools with Restore — fetched only when expanded. */
function RecentlyDeletedSchools({ version, onRestored }: { version: number; onRestored: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data, mutate } = useSWR<{ schools: DeletedSchool[] }>(
    expanded ? `/api/schools?deleted=1&v=${version}` : null,
    fetcher,
  );
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function restore(school: DeletedSchool) {
    setRestoringId(school.id);
    try {
      const res = await fetch(`/api/schools/${school.id}/restore`, { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Could not restore the school.");
        return;
      }
      toast.success(`${school.name} restored. Assign a supervisor again if needed.`);
      mutate();
      onRestored();
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-fit items-center gap-2 text-lg font-semibold"
      >
        <ChevronDown className={cn("size-5 transition-transform", !expanded && "-rotate-90")} />
        Recently Deleted
      </button>
      {expanded && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School Name</TableHead>
                <TableHead>Municipality</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell>{school.municipality}</TableCell>
                  <TableCell className="capitalize">{school.type.toLowerCase()}</TableCell>
                  <TableCell>{formatManila(new Date(school.deletedAt), "MMM d, yyyy h:mm a")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => restore(school)} disabled={restoringId === school.id}>
                      <RotateCcw /> {restoringId === school.id ? "Restoring…" : "Restore"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data && !data.schools.length && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No deleted schools.
                  </TableCell>
                </TableRow>
              )}
              {!data && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
