import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/session";
import type { SessionUser } from "@/lib/auth";
export async function listAuditLogs(actor: SessionUser) { if (actor.role !== "ADMIN") throw new ForbiddenError(); return prisma.auditLog.findMany({ include: { actorUser: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 500 }); }
