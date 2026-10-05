import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import type { NotificationType, Prisma } from "@/generated/prisma/client";

export async function listNotifications(actor: SessionUser, limit = 100) { return prisma.notification.findMany({ where: { userId: actor.id }, orderBy: { createdAt: "desc" }, take: Math.min(Math.max(limit, 1), 100) }); }
export async function countUnreadNotifications(actor: SessionUser) { return prisma.notification.count({ where: { userId: actor.id, readAt: null } }); }
export async function markNotificationRead(actor: SessionUser, id: string) { return prisma.notification.updateMany({ where: { id, userId: actor.id }, data: { readAt: new Date() } }); }
export async function markAllNotificationsRead(actor: SessionUser) { return prisma.notification.updateMany({ where: { userId: actor.id, readAt: null }, data: { readAt: new Date() } }); }
export async function savePushSubscription(actor: SessionUser, input: { endpoint: string; p256dh: string; auth: string }) { return prisma.pushSubscription.upsert({ where: { endpoint: input.endpoint }, update: { userId: actor.id, p256dh: input.p256dh, auth: input.auth }, create: { userId: actor.id, ...input } }); }

/** Sends the same in-app notification to every active ADMIN (the CTE office). */
export async function notifyAdmins(
  notice: { type: NotificationType; title: string; body: string; href?: string },
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;
  const admins = await client.user.findMany({ where: { role: "ADMIN", status: "ACTIVE", deletedAt: null }, select: { id: true } });
  if (!admins.length) return;
  await client.notification.createMany({ data: admins.map((admin) => ({ userId: admin.id, ...notice })) });
}
