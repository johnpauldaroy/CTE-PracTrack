import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

/** A business-rule failure tied to specific form fields (e.g. an email that's already taken). */
export class FieldValidationError extends Error {
  constructor(public fieldErrors: Record<string, string[]>) {
    super("Validation failed");
    this.name = "FieldValidationError";
  }
}

/** The request is valid but conflicts with current state (e.g. deleting a school that still has interns). */
export class ConflictError extends Error {
  constructor(message = "Conflict") {
    super(message);
    this.name = "ConflictError";
  }
}

/** The account was locked or deactivated after the user signed in. */
export class AccountInactiveError extends UnauthorizedError {
  constructor() {
    super("Your account is locked or inactive. Please contact the CTE office.");
    this.name = "AccountInactiveError";
  }
}

/**
 * Re-reads the account from the database so an admin's lock, a deactivation, or a
 * change of a supervisor's schools takes effect on the very next request instead of
 * when the JWT expires. One primary-key lookup. Returns null when the account may
 * no longer sign in.
 */
async function resolveLiveUser(tokenUser: SessionUser): Promise<SessionUser | null> {
  const row = await prisma.user.findUnique({
    where: { id: tokenUser.id },
    select: {
      status: true,
      deletedAt: true,
      role: true,
      supervisorProfile: { select: { schools: { select: { schoolId: true } } } },
      ctProfile: { select: { id: true } },
      internProfile: { select: { id: true } },
    },
  });
  if (!row || row.deletedAt || row.status !== "ACTIVE") return null;
  return {
    ...tokenUser,
    role: row.role,
    supervisorSchoolIds: row.supervisorProfile?.schools.map((entry) => entry.schoolId) ?? [],
    cooperatingTeacherProfileId: row.ctProfile?.id ?? null,
    internProfileId: row.internProfile?.id ?? null,
  };
}

/**
 * Every API route and server action that touches scoped data calls this
 * first. There is no other way to obtain the acting user's identity — role
 * and scope always come from the session, never from the request body
 * (CLAUDE.md). Role and school/intern scope are re-derived from the database
 * on every call, so they can never be stale.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  const live = await resolveLiveUser(session.user);
  if (!live) throw new AccountInactiveError();
  return live;
}

/** For server-component layouts: the live user, or null when signed out or no longer active. */
export async function getLiveSession(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return resolveLiveUser(session.user);
}

/** Throws unless the session's role is one of `roles`. */
export async function requireRole(...roles: SessionUser["role"][]): Promise<SessionUser> {
  const user = await requireSession();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}
