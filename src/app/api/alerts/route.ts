import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { ensureAlertsFresh, evaluateAlerts, listAlerts } from "@/lib/services/alert-service";
export async function GET(request: NextRequest) { try { const user = await requireSession(); const status = request.nextUrl.searchParams.get("status") === "resolved" ? "RESOLVED" : "ACTIVE"; if (status === "ACTIVE") await ensureAlertsFresh(); return NextResponse.json({ alerts: await listAlerts(user, status) }); } catch (error) { return toApiErrorResponse(error); } }
export async function POST() { try { return NextResponse.json({ result: await evaluateAlerts(await requireSession()) }); } catch (error) { return toApiErrorResponse(error); } }
