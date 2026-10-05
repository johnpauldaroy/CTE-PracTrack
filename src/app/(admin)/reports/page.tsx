import { requireRole } from "@/lib/session";
import { getReports, listReportableShiftings } from "@/lib/services/report-service";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ReportDownloads, ShiftingReport, shiftingLabel } from "@/components/admin/reports/shifting-report";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ shiftingId?: string }> }) {
  const actor = await requireRole("ADMIN");
  const { shiftingId } = await searchParams;
  const [data, shiftings] = await Promise.all([getReports(actor, { shiftingId }), listReportableShiftings(actor)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            {data.shifting ? shiftingLabel(data.shifting) : "No active shifting"}
            {data.isArchive ? " · archived, read-only" : " · current active shifting"} · derived from source records
          </p>
        </div>
        <ReportDownloads shiftingId={data.isArchive ? data.shifting?.id : undefined} />
      </div>

      {shiftings.length > 1 && (
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
            <Label htmlFor="report-shifting">Shifting</Label>
            <select
              id="report-shifting"
              name="shiftingId"
              defaultValue={data.shifting?.id ?? ""}
              className="h-8 w-full rounded-lg sm:min-w-72 border border-input bg-transparent px-2.5 text-sm"
            >
              {shiftings.map((s) => (
                <option key={s.id} value={s.id}>
                  {shiftingLabel(s)}
                  {s.status === "ACTIVE" ? " (active)" : ""}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" size="sm" variant="outline">
            Show
          </Button>
        </form>
      )}

      <ShiftingReport data={data} />
    </div>
  );
}
