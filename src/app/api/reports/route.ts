import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { getReports } from "@/lib/services/report-service";
function csv(rows: Record<string, unknown>[]) { if (!rows.length) return ""; const keys = Object.keys(rows[0]); const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`; return [keys.map(escape).join(","), ...rows.map((row) => keys.map((key) => escape(row[key])).join(","))].join("\r\n"); }
export async function GET(request: NextRequest) { try { const reports = await getReports(await requireSession()); const type = request.nextUrl.searchParams.get("type"); if (type === "attendance" || type === "compliance") return new NextResponse(csv(reports[type]), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="practrack-${type}.csv"` } }); return NextResponse.json(reports); } catch (error) { return toApiErrorResponse(error); } }
