"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InternDetailSheet } from "@/components/admin/accounts/intern-detail-sheet";
import type { getReports } from "@/lib/services/report-service";

type InternRow = Awaited<ReturnType<typeof getReports>>["interns"][number];

/**
 * One row per intern for a shifting, filterable by school, by student, or by
 * student within a school. Clicking a row opens the intern's full record.
 */
export function PerStudentReport({ rows, shiftingId }: { rows: InternRow[]; shiftingId?: string }) {
  const [schoolId, setSchoolId] = useState("");
  const [query, setQuery] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);

  const schools = useMemo(
    () => [...new Map(rows.map((row) => [row.schoolId, row.school])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    [rows],
  );
  const q = query.trim().toLowerCase();
  const filtered = rows.filter(
    (row) =>
      (!schoolId || row.schoolId === schoolId) &&
      (!q || row.name.toLowerCase().includes(q) || row.schoolNumber.toLowerCase().includes(q)),
  );

  const params = new URLSearchParams({ type: "interns" });
  if (shiftingId) params.set("shiftingId", shiftingId);
  if (schoolId) params.set("schoolId", schoolId);
  if (q) params.set("q", q);

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
          <label htmlFor="per-student-school" className="text-sm font-medium">
            School
          </label>
          <select
            id="per-student-school"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm sm:min-w-64"
          >
            <option value="">All schools</option>
            {schools.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search student name or ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Search student"
          />
        </div>
        <Button variant="outline" render={<a href={`/api/reports?${params}`} />}>
          <Download /> Per Student CSV
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {rows.length} interns. Average score is a reference summary, not an official grade.
      </p>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              {["Intern", "School", "Present", "Late", "Absences", "Excused", "Rate", "Sessions", "Final Demo", "Status", "Avg. Score*", "Missing LP / PR", "Narrative", "Portfolio", "Alerts"].map((h) => (
                <th key={h} className="p-3 text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.internId}
                className="cursor-pointer border-t hover:bg-muted/50"
                onClick={() => setViewingId(row.internId)}
              >
                <td className="p-3">
                  <button type="button" className="text-left font-medium hover:underline">
                    {row.name}
                  </button>
                  <p className="text-xs text-muted-foreground">{row.schoolNumber}</p>
                </td>
                <td className="min-w-44 p-3">{row.school}</td>
                <td className="p-3">{row.present}</td>
                <td className="p-3">{row.late}</td>
                <td className="p-3">{row.absences}</td>
                <td className="p-3">{row.excused}</td>
                <td className="p-3">{row.attendanceRate}%</td>
                <td className="p-3">
                  {row.regularEvaluated}/{row.requiredTeachingSessions}
                </td>
                <td className="p-3">
                  {row.finalDemosEvaluated}/{row.requiredFinalDemos}
                </td>
                <td className="p-3">
                  {row.behind ? <Badge variant="destructive">Behind</Badge> : <Badge variant="secondary">On track</Badge>}
                </td>
                <td className="p-3">{row.averageScore ? `${Number(row.averageScore).toFixed(2)}%` : "—"}</td>
                <td className="p-3">
                  {row.missingLessonPlans} / {row.missingProgressReports}
                </td>
                <td className="p-3">{row.narrativeSubmitted ? "✓" : "—"}</td>
                <td className="p-3">{row.portfolioSubmitted ? "✓" : "—"}</td>
                <td className="p-3">{row.activeAlerts || "—"}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={15} className="p-6 text-center text-muted-foreground">
                  {rows.length ? "No interns match these filters." : "No interns in this shifting."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <InternDetailSheet internId={viewingId} onOpenChange={(open) => !open && setViewingId(null)} />
    </div>
  );
}
