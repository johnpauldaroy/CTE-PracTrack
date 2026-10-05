import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { listAuditLogs } from "@/lib/services/audit-service";
import { auditLogFiltersSchema } from "@/lib/validation/audit";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const filters = auditLogFiltersSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    return NextResponse.json(await listAuditLogs(user, filters));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
