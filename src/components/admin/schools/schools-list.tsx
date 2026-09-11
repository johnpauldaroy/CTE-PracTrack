"use client";

import { useState } from "react";
import Link from "next/link";
import { useSchools } from "@/lib/hooks/use-schools";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AddSchoolSheet } from "@/components/admin/schools/add-school-sheet";

export function SchoolsList() {
  const { schools, isLoading, mutate } = useSchools();
  const [addOpen, setAddOpen] = useState(false);

  const secondary = schools.filter((s) => s.type === "SECONDARY");
  const elementary = schools.filter((s) => s.type === "ELEMENTARY");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold">Schools</h1>
        <Button onClick={() => setAddOpen(true)}>+ Add School</Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <SchoolTable title="Secondary Schools" schools={secondary} />
          <SchoolTable title="Elementary Schools" schools={elementary} />
        </>
      )}

      <AddSchoolSheet open={addOpen} onOpenChange={setAddOpen} onCreated={() => mutate()} />
    </div>
  );
}

function SchoolTable({
  title,
  schools,
}: {
  title: string;
  schools: ReturnType<typeof useSchools>["schools"];
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
                  <Button variant="outline" size="sm" render={<Link href={`/schools/${school.id}`} />}>
                    View
                  </Button>
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
