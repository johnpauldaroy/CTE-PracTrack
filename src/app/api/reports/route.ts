import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { getReports } from "@/lib/services/report-service";
import { formatManila } from "@/lib/timezone";

function csv(rows: Record<string, unknown>[]) { if (!rows.length) return ""; const keys = Object.keys(rows[0]); const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`; return [keys.map(escape).join(","), ...rows.map((row) => keys.map((key) => escape(row[key])).join(","))].join("\r\n"); }

export async function GET(request: NextRequest) {
  try {
    const shiftingId = request.nextUrl.searchParams.get("shiftingId") ?? undefined;
    const reports = await getReports(await requireSession(), { shiftingId });
    const type = request.nextUrl.searchParams.get("type");
    const suffix = reports.shifting
      ? `-${reports.shifting.semester.academicYear.label}-${reports.shifting.semester.name}-${reports.shifting.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-")
      : "";
    const rows =
      type === "attendance" || type === "compliance"
        ? reports[type]
        : type === "alerts"
          ? reports.alerts.map((alert) => ({
              raised: formatManila(alert.raisedAt, "yyyy-MM-dd HH:mm"),
              school: alert.intern.assignedSchool.name,
              intern: alert.intern.user.name,
              type: alert.type,
              severity: alert.severity,
              detail: alert.detail,
              status: alert.status,
              resolvedAt: alert.resolvedAt ? formatManila(alert.resolvedAt, "yyyy-MM-dd HH:mm") : "",
              resolvedBy: alert.resolvedByUser?.name ?? "",
              resolutionNote: alert.resolutionNote ?? "",
            }))
          : null;
    if (rows) {
      return new NextResponse(csv(rows), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="practrack-${type}${suffix}.csv"` },
      });
    }
    return NextResponse.json(reports);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
