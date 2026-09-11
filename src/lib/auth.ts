import NextAuth, { type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
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

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["ADMIN", "SUPERVISOR", "COOPERATING_TEACHER", "STUDENT_INTERN"]),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        role: {},
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, role } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            supervisorProfile: true,
            ctProfile: true,
            internProfile: true,
          },
        });

        if (!user || user.deletedAt || user.role !== role) return null;
        if (user.status !== "ACTIVE") return null;

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        const sessionUser: SessionUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          supervisorSchoolId: user.supervisorProfile?.schoolId ?? null,
          cooperatingTeacherProfileId: user.ctProfile?.id ?? null,
          internProfileId: user.internProfile?.id ?? null,
        };

        return sessionUser as unknown as User;
      },
    }),
  ],
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
});
