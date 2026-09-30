import { requireRole } from "@/lib/session";
import { getReports } from "@/lib/services/report-service";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarCheck, ClipboardList, Download, ShieldCheck } from "lucide-react";

export default async function ReportsPage() {
  const data = await getReports(await requireRole("ADMIN"));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Current active shifting · derived from source records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<a href="/api/reports?type=attendance" />}>
            <Download /> Attendance CSV
          </Button>
          <Button variant="outline" render={<a href="/api/reports?type=compliance" />}>
            <Download /> Compliance CSV
          </Button>
        </div>
      </div>
      <Tabs defaultValue="attendance">
        <TabsList className="grid w-full grid-cols-3 sm:w-fit">
          <TabsTrigger value="attendance">
            <CalendarCheck /> Attendance
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <ClipboardList /> Session & Documents
          </TabsTrigger>
          <TabsTrigger value="resolved">
            <ShieldCheck /> Resolved Alerts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
          <ReportTable
            headers={["School", "Interns", "Present", "Absences", "Excused", "Late", "Rate"]}
            rows={data.attendance.map((r) => [
              r.school,
              r.interns,
              r.present,
              r.absences,
              r.excused,
              r.late,
              `${r.attendanceRate}%`,
            ])}
          />
        </TabsContent>
        <TabsContent value="compliance">
          <ReportTable
            headers={["School", "On Track", "Behind", "Sessions", "Missing LP", "Missing PR"]}
            rows={data.compliance.map((r) => [
              r.school,
              r.onTrack,
              r.behind,
              r.sessionsLogged,
              r.missingLessonPlans,
              r.missingProgressReports,
            ])}
          />
        </TabsContent>
        <TabsContent value="resolved">
          <ReportTable
            headers={["Date", "School", "Intern", "Flag", "Resolved By", "Note"]}
            rows={data.resolvedAlerts.map((r) => [
              r.resolvedAt?.toLocaleDateString() ?? "—",
              r.intern.assignedSchool.name,
              r.intern.user.name,
              r.type,
              r.resolvedByUser?.name ?? "—",
              r.resolutionNote ?? "—",
            ])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
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
        </tbody>
      </table>
    </div>
  );
}
