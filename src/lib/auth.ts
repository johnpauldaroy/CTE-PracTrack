import NextAuth, { CredentialsSignin, type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig, type SessionUser } from "@/lib/auth.config";

export type { SessionUser } from "@/lib/auth.config";

// No role in the credentials: emails are unique across roles, so the account
// itself decides where the user lands (src/app/page.tsx routes by role).
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Correct password, but the CT / supervisor registration hasn't been approved yet. */
class PendingApprovalError extends CredentialsSignin {
  code = "pending_approval";
}

/** Correct password, but an admin has locked the account (e.g. the semester ended). */
class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}

/** Intern registered but has not entered the emailed verification code yet. */
class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

/** Intern verified their email; the school's supervisor has not confirmed enrollment yet. */
class EnrollmentPendingError extends CredentialsSignin {
  code = "enrollment_pending";
}

class EnrollmentRejectedError extends CredentialsSignin {
  code = "enrollment_rejected";
}

// Full config (Node.js runtime only — routes, server components, server
// actions). Never import this from middleware.ts; use auth.config.ts there.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          omit: { passwordHash: false },
          include: {
            supervisorProfile: { include: { schools: { select: { schoolId: true } } } },
            ctProfile: true,
            internProfile: true,
          },
        });

        if (!user || user.deletedAt) return null;

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        // Only reveal account state to someone who already proved the password.
        if (user.status === "LOCKED" && !user.deletedAt) throw new AccountLockedError();
        if (user.status === "PENDING") {
          if (user.role === "STUDENT_INTERN") {
            if (!user.emailVerifiedAt) throw new EmailNotVerifiedError();
            if (user.internProfile?.enrollmentStatus === "REJECTED") throw new EnrollmentRejectedError();
            throw new EnrollmentPendingError();
          }
          throw new PendingApprovalError();
        }
        if (user.status !== "ACTIVE") return null;

        const sessionUser: SessionUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          supervisorSchoolIds: user.supervisorProfile?.schools.map((s) => s.schoolId) ?? [],
          cooperatingTeacherProfileId: user.ctProfile?.id ?? null,
          internProfileId: user.internProfile?.id ?? null,
        };

        return sessionUser as unknown as User;
      },
    }),
  ],
});
