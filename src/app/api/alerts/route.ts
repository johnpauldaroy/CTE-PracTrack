import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { evaluateAlerts, listAlerts } from "@/lib/services/alert-service";
export async function GET(request: NextRequest) { try { const status = request.nextUrl.searchParams.get("status") === "resolved" ? "RESOLVED" : "ACTIVE"; return NextResponse.json({ alerts: await listAlerts(await requireSession(), status) }); } catch (error) { return toApiErrorResponse(error); } }
export async function POST() { try { return NextResponse.json({ alerts: await evaluateAlerts(await requireSession()) }); } catch (error) { return toApiErrorResponse(error); } }
