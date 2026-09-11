"use client";

import useSWR from "swr";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InternRow {
  id: string;
  schoolNumber: string;
  name: string;
  course: string;
  sessionsLogged: number;
  absences: number;
}

export function SchoolInternsTab({ schoolId }: { schoolId: string }) {
  const { data, isLoading } = useSWR<{ interns: InternRow[] }>(
    `/api/schools/${schoolId}/interns`,
    fetcher,
  );

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const interns = data?.interns ?? [];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{interns.length} Interns Assigned</h2>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Absences</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interns.map((intern) => (
              <TableRow key={intern.id}>
                <TableCell>{intern.schoolNumber}</TableCell>
                <TableCell className="font-medium">{intern.name}</TableCell>
                <TableCell className="text-secondary">{intern.course}</TableCell>
                <TableCell>{intern.sessionsLogged}/15</TableCell>
                <TableCell className={intern.absences > 0 ? "font-medium text-destructive" : "text-secondary"}>
                  {intern.absences}
                </TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    Unassign
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {interns.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No interns assigned yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
