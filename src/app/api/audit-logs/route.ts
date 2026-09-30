import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { listAuditLogs } from "@/lib/services/audit-service";
export async function GET() { try { return NextResponse.json({ logs: await listAuditLogs(await requireSession()) }); } catch (error) { return toApiErrorResponse(error); } }
