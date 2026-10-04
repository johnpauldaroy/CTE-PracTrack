import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { countUnreadNotifications, listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/services/notification-service";

const markReadSchema = z.union([z.object({ id: z.string().min(1) }), z.object({ all: z.literal(true) })]);

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 100) || 100;
    const [notifications, unreadCount] = await Promise.all([listNotifications(user, limit), countUnreadNotifications(user)]);
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireSession();
    const input = markReadSchema.parse(await request.json());
    if ("all" in input) await markAllNotificationsRead(user);
    else await markNotificationRead(user, input.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
