import { CalendarCheck, ClipboardList, Download, ShieldCheck } from "lucide-react";
import { formatManila } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getReports } from "@/lib/services/report-service";

type Reports = Awaited<ReturnType<typeof getReports>>;

const SHIFTING_NAME = { FIRST: "First Shifting", SECOND: "Second Shifting" } as const;

export function shiftingLabel(shifting: NonNullable<Reports["shifting"]>) {
  return `${SHIFTING_NAME[shifting.name]} · ${shifting.semester.name} ${shifting.semester.academicYear.label}`;
}

function humanize(code: string) {
  const words = code.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** CSV download buttons for one shifting's report. */
export function ReportDownloads({ shiftingId }: { shiftingId?: string }) {
  const suffix = shiftingId ? `&shiftingId=${encodeURIComponent(shiftingId)}` : "";
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" render={<a href={`/api/reports?type=attendance${suffix}`} />}>
        <Download /> Attendance CSV
      </Button>
      <Button variant="outline" render={<a href={`/api/reports?type=compliance${suffix}`} />}>
        <Download /> Compliance CSV
      </Button>
      <Button variant="outline" render={<a href={`/api/reports?type=alerts${suffix}`} />}>
        <Download /> Alerts CSV
      </Button>
    </div>
  );
}

/** Attendance / compliance / alert-history tables for one shifting (Reports page and shifting archive). */
export function ShiftingReport({ data }: { data: Reports }) {
  return (
    <Tabs defaultValue="attendance">
      <TabsList className="grid w-full grid-cols-3 sm:w-fit">
        <TabsTrigger value="attendance">
          <CalendarCheck /> Attendance
        </TabsTrigger>
        <TabsTrigger value="compliance">
          <ClipboardList /> Session & Documents
        </TabsTrigger>
        <TabsTrigger value="alerts">
          <ShieldCheck /> Alert History
        </TabsTrigger>
      </TabsList>
      <TabsContent value="attendance">
        <ReportTable
          headers={["School", "Interns", "Present", "Absences", "Excused", "Late", "Rate"]}
          empty="No attendance recorded for this shifting."
          rows={data.attendance.map((r) => [r.school, r.interns, r.present, r.absences, r.excused, r.late, `${r.attendanceRate}%`])}
        />
      </TabsContent>
      <TabsContent value="compliance">
        <ReportTable
          headers={["School", "On Track", "Behind", "Sessions", "Missing LP", "Missing PR"]}
          empty="No teaching sessions recorded for this shifting."
          rows={data.compliance.map((r) => [r.school, r.onTrack, r.behind, r.sessionsLogged, r.missingLessonPlans, r.missingProgressReports])}
        />
      </TabsContent>
      <TabsContent value="alerts">
        <ReportTable
          headers={["Raised", "School", "Intern", "Flag", "Status", "Resolved By", "Note"]}
          empty="No alerts were raised in this shifting."
          rows={data.alerts.map((r) => [
            formatManila(r.raisedAt, "MMM d, yyyy"),
            r.intern.assignedSchool.name,
            r.intern.user.name,
            humanize(r.type),
            r.status === "ACTIVE" ? (
              <Badge key="s" variant="destructive">Active</Badge>
            ) : (
              <span key="s">Resolved {r.resolvedAt ? formatManila(r.resolvedAt, "MMM d") : ""}</span>
            ),
            r.resolvedByUser?.name ?? "—",
            r.resolutionNote ?? "—",
          ])}
        />
      </TabsContent>
    </Tabs>
  );
}

function ReportTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            {headers.map((h) => (
              <th key={h} className="p-3 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t">
              {row.map((cell, j) => (
                <td key={j} className="p-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={headers.length} className="p-6 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
