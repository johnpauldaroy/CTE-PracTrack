"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AcademicYearData } from "@/components/admin/semesters/semesters-page";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ArchivedAcademicYears({ version = 0 }: { version?: number }) {
  const [expanded, setExpanded] = useState(false);
  const { data } = useSWR<{ academicYears: AcademicYearData[] }>(
    expanded ? `/api/academic-years/archived?v=${version}` : null,
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
              <CardContent className="flex flex-col gap-3 p-4">
                <p className="font-medium">Academic Year {year.label}</p>
                {year.semesters.map((semester) => (
                  <div key={semester.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{semester.name}:</span>
                    {semester.shiftings.map((shifting) => (
                      <Link
                        key={shifting.id}
                        href={`/semesters/shiftings/${shifting.id}`}
                        className="rounded-md border px-2 py-1 font-medium text-secondary hover:bg-muted"
                      >
                        {shifting.name === "FIRST" ? "First" : "Second"} Shifting archive
                      </Link>
                    ))}
                  </div>
                ))}
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
