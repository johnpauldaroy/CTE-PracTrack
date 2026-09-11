import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Every API route and server action that touches scoped data calls this
 * first. There is no other way to obtain the acting user's identity — role
 * and scope always come from the session, never from the request body
 * (CLAUDE.md).
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session.user;
}

/** Throws unless the session's role is one of `roles`. */
export async function requireRole(...roles: SessionUser["role"][]): Promise<SessionUser> {
  const user = await requireSession();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}
