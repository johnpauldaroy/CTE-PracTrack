import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/client";

// Everything a request needs to enforce scope, carried on the JWT session so
// no route ever has to re-derive it from a client-supplied id (CLAUDE.md).
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  // Populated only for the role it applies to; every other field is undefined.
  supervisorSchoolId?: string | null;
  cooperatingTeacherProfileId?: string | null;
  internProfileId?: string | null;
}

/**
 * Edge-safe NextAuth config: session/callback logic only, no providers.
 * Middleware runs on the Edge Runtime, which cannot load the Prisma client
 * (it needs Node.js `node:path`/`node:process`/native bindings) — so the
 * Credentials provider (and anything else that touches the database) lives
 * only in auth.ts, which is never imported by middleware.ts.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        const sessionUser = user as unknown as SessionUser;
        token.role = sessionUser.role;
        token.supervisorSchoolId = sessionUser.supervisorSchoolId;
        token.cooperatingTeacherProfileId = sessionUser.cooperatingTeacherProfileId;
        token.internProfileId = sessionUser.internProfileId;
        token.name = sessionUser.name;
        token.email = sessionUser.email;
        token.sub = sessionUser.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      const sessionUser: SessionUser = {
        id: token.sub as string,
        email: (token.email as string) ?? "",
        name: (token.name as string) ?? "",
        role: token.role as Role,
        supervisorSchoolId: token.supervisorSchoolId as string | null | undefined,
        cooperatingTeacherProfileId: token.cooperatingTeacherProfileId as string | null | undefined,
        internProfileId: token.internProfileId as string | null | undefined,
      };
      session.user = sessionUser as unknown as typeof session.user;
      return session;
    },
  },
} satisfies NextAuthConfig;
