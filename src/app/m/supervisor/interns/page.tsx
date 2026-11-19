"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddInternSheet } from "@/components/interns/add-intern-sheet";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InternRow {
  id: string;
  schoolNumber: string | null;
  schoolId?: string;
  schoolName?: string;
  name: string;
  course: string;
  sessionsLogged: number;
  absences: number;
  isFlagged: boolean;
  isBehind: boolean;
}

export default function SupervisorInternsPage() {
  const { data, isLoading, mutate } = useSWR<{ interns: InternRow[]; activeShifting: { requiredTeachingSessions: number } | null }>(
    "/api/supervisor/interns",
    fetcher,
  );
  const requiredSessions = data?.activeShifting?.requiredTeachingSessions;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "flagged" | "behind">("all");
  // A supervisor can cover several schools; this only narrows the view (scope still comes from the session).
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const { data: enrollmentData } = useSWR<{ requests: unknown[] }>("/api/enrollments", fetcher);
  const pendingEnrollments = enrollmentData?.requests?.length ?? 0;
  const [isAdding, setIsAdding] = useState(false);

  const interns = (data?.interns ?? []).filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || (i.schoolNumber ?? "").includes(search);
    const matchesSchool = schoolFilter === "all" || i.schoolId === schoolFilter;
    const matchesFilter = filter === "all" || (filter === "flagged" && i.isFlagged) || (filter === "behind" && i.isBehind);
    return matchesSearch && matchesFilter && matchesSchool;
  });

  const schools = [...new Map((data?.interns ?? []).filter((i) => i.schoolId).map((i) => [i.schoolId!, i.schoolName ?? ""])).entries()];

  // Flagged / Behind come from active alerts, so they follow the configured flagging rules.
  const flaggedCount = data?.interns.filter((i) => i.isFlagged).length ?? 0;
  const behindCount = data?.interns.filter((i) => i.isBehind).length ?? 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-xl font-bold">Interns</h1>
        <Button size="sm" onClick={() => setIsAdding(true)}>
          <Plus /> Add Intern
        </Button>
      </div>

      {pendingEnrollments > 0 && (
        <Link
          href="/m/supervisor/enrollments"
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
        >
          {pendingEnrollments} enrollment request{pendingEnrollments > 1 ? "s" : ""} waiting for you →
        </Link>
      )}

      {schools.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {[["all", "All schools"], ...schools].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSchoolFilter(id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                schoolFilter === id ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search interns..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        {(
          [
            { key: "all", label: `All ${data?.interns.length ?? 0}` },
            { key: "flagged", label: `Flagged ${flaggedCount}` },
            { key: "behind", label: `Behind ${behindCount}` },
          ] as const
        ).map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setFilter(chip.key)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              filter === chip.key ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col divide-y rounded-lg border">
          {interns.map((intern) => (
            <Link
              key={intern.id}
              href={`/m/supervisor/interns/${intern.id}`}
              className="flex items-center justify-between p-3"
            >
              <div>
                <p className="font-medium">{intern.name}</p>
                {schools.length > 1 && <p className="text-xs text-muted-foreground">{intern.schoolName}</p>}
                <p className="text-xs text-muted-foreground">
                  {intern.sessionsLogged}{requiredSessions ? `/${requiredSessions}` : ""} sessions · {intern.absences} absences
                </p>
              </div>
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  intern.isFlagged ? "bg-destructive" : "bg-success",
                )}
              />
            </Link>
          ))}
          {interns.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No interns found.</p>
          )}
        </div>
      )}
      <AddInternSheet variant="supervisor" open={isAdding} onOpenChange={setIsAdding} onSaved={() => mutate()} />
    </div>
  );
}
