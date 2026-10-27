import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/services/notification-service";
import type { CtRegistrationInput } from "@/lib/validation/ct-registration";

/**
 * Public self-registration (no session — this is the one intentionally
 * unauthenticated write in the app, per PRD §4/§6.1). Creates a PENDING
 * user + CooperatingTeacherProfile; nothing here is queryable or usable
 * until an admin approves it (see ct-approval-service.ts). The CT chooses
 * their own password here; sign-in stays blocked until approval.
 */
export async function registerCooperatingTeacher(input: CtRegistrationInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: "COOPERATING_TEACHER",
        status: "PENDING",
        name: input.name,
        phone: input.phone,
        ctProfile: {
          create: { schoolId: input.schoolId },
        },
      },
      include: { ctProfile: { include: { school: { select: { name: true } } } } },
    });

    await notifyAdmins(
      {
        type: "CT_REGISTRATION_PENDING",
        title: "New cooperating teacher registration",
        body: `${user.name} (${user.ctProfile?.school.name ?? "unknown school"}) is waiting for approval.`,
        href: "/accounts?tab=cts",
      },
      tx,
    );

    return user;
  });
}
