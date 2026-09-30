import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { listNotifications, markNotificationRead } from "@/lib/services/notification-service";
export async function GET() { try { return NextResponse.json({ notifications: await listNotifications(await requireSession()) }); } catch (error) { return toApiErrorResponse(error); } }
export async function PATCH(request: NextRequest) { try { const { id } = z.object({ id: z.string().min(1) }).parse(await request.json()); await markNotificationRead(await requireSession(), id); return NextResponse.json({ ok: true }); } catch (error) { return toApiErrorResponse(error); } }
