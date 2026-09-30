import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
export async function listNotifications(actor: SessionUser) { return prisma.notification.findMany({ where: { userId: actor.id }, orderBy: { createdAt: "desc" }, take: 100 }); }
export async function markNotificationRead(actor: SessionUser, id: string) { return prisma.notification.updateMany({ where: { id, userId: actor.id }, data: { readAt: new Date() } }); }
export async function savePushSubscription(actor: SessionUser, input: { endpoint: string; p256dh: string; auth: string }) { return prisma.pushSubscription.upsert({ where: { endpoint: input.endpoint }, update: { userId: actor.id, p256dh: input.p256dh, auth: input.auth }, create: { userId: actor.id, ...input } }); }
