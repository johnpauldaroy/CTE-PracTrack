"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InternRow {
  id: string;
  schoolNumber: string;
  name: string;
  course: string;
  sessionsLogged: number;
  absences: number;
}

export default function SupervisorInternsPage() {
  const { data, isLoading } = useSWR<{ interns: InternRow[] }>("/api/supervisor/interns", fetcher);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "flagged" | "behind">("all");

  const interns = (data?.interns ?? []).filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.schoolNumber.includes(search);
    const matchesFilter = filter === "all" || (filter === "flagged" && i.absences > 0) || (filter === "behind" && i.sessionsLogged < 9);
    return matchesSearch && matchesFilter;
  });

  const flaggedCount = data?.interns.filter((i) => i.absences > 0).length ?? 0;
  const behindCount = data?.interns.filter((i) => i.sessionsLogged < 9).length ?? 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="font-heading text-xl font-bold">Interns</h1>

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
                <p className="text-xs text-muted-foreground">
                  {intern.sessionsLogged}/15 sessions · {intern.absences} absences
                </p>
              </div>
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  intern.absences > 0 ? "bg-destructive" : "bg-success",
                )}
              />
            </Link>
          ))}
          {interns.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No interns found.</p>
          )}
        </div>
      )}
    </div>
  );
}
