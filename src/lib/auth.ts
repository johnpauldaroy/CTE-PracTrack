import NextAuth, { type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig, type SessionUser } from "@/lib/auth.config";

export type { SessionUser } from "@/lib/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["ADMIN", "SUPERVISOR", "COOPERATING_TEACHER", "STUDENT_INTERN"]),
});

// Full config (Node.js runtime only — routes, server components, server
// actions). Never import this from middleware.ts; use auth.config.ts there.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
});
