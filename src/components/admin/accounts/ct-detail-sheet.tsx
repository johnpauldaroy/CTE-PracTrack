"use client";

import useSWR from "swr";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CtDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  school: { name: string };
  requiredTeachingSessions: number | null;
  assignedInterns: { id: string; name: string; course: string; sessionsLogged: number; absences: number }[];
}

export function CtDetailSheet({ ctId, onOpenChange }: { ctId: string | null; onOpenChange: (open: boolean) => void }) {
  const { data, isLoading } = useSWR<{ ct: CtDetail }>(ctId ? `/api/accounts/cts/${ctId}` : null, fetcher);

  return (
    <Sheet open={!!ctId} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        {isLoading || !data?.ct ? (
          <div className="flex flex-col gap-3 px-4 pt-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{data.ct.name}</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 pb-4">
              <div className="text-sm text-muted-foreground">
                <p>Email: {data.ct.email}</p>
                <p>Phone: {data.ct.phone ?? "—"}</p>
                <p>School: {data.ct.school.name}</p>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Assigned Interns ({data.ct.assignedInterns.length})</h3>
                <div className="flex flex-col gap-2">
                  {data.ct.assignedInterns.map((intern) => (
                    <div key={intern.id} className="rounded-lg border p-3">
                      <p className="font-medium">{intern.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {intern.course} · {intern.sessionsLogged}/{data.ct.requiredTeachingSessions ?? "—"}{" "}
                        sessions · {intern.absences} absences
                      </p>
                    </div>
                  ))}
                  {data.ct.assignedInterns.length === 0 && (
                    <p className="text-sm text-muted-foreground">No interns assigned yet.</p>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Read-only view.</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
