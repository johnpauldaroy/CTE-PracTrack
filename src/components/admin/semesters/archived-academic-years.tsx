"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AcademicYearData } from "@/components/admin/semesters/semesters-page";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ArchivedAcademicYears() {
  const [expanded, setExpanded] = useState(false);
  const { data } = useSWR<{ academicYears: AcademicYearData[] }>(
    expanded ? "/api/academic-years/archived" : null,
    fetcher,
  );

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-lg font-semibold"
      >
        {expanded ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
        Archived Academic Years
      </button>

      {expanded && (
        <div className="flex flex-col gap-3">
          {data?.academicYears.map((year) => (
            <Card key={year.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">Academic Year {year.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {year.semesters
                      .map(
                        (s) =>
                          `${s.name} — ${s.shiftings.map((sh) => `${sh.name === "FIRST" ? "First" : "Second"} Shifting: ${sh.status === "COMPLETED" ? "Completed" : sh.status}`).join(" · ")}`,
                      )
                      .join(" · ")}
                  </p>
                </div>
                <span className="text-sm font-medium text-secondary">View Archive</span>
              </CardContent>
            </Card>
          ))}
          {data?.academicYears.length === 0 && (
            <p className="text-sm text-muted-foreground">No archived academic years yet.</p>
          )}
          {!data && <p className="text-sm text-muted-foreground">Loading…</p>}
        </div>
      )}
    </div>
  );
}
