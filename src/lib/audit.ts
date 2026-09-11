import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

/**
 * The one audit-log writer in the project (CLAUDE.md). Call this from the
 * service function that performs the mutation, never from the route
 * handler — that way a mutation cannot ship without an audit entry just
 * because a new route forgot to call it.
 *
 * Pass `tx` when writing inside a transaction so the log entry commits or
 * rolls back atomically with the mutation it describes.
 */
export async function writeAuditLog(
  params: {
    actor: SessionUser;
    action: string;
    entityType: string;
    entityId: string;
    diff?: Prisma.InputJsonValue;
    ipAddress?: string | null;
  },
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: {
      actorUserId: params.actor.id,
      actorRole: params.actor.role,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      diff: params.diff,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
