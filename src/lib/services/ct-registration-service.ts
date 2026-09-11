import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { CtRegistrationInput } from "@/lib/validation/ct-registration";

/**
 * Public self-registration (no session — this is the one intentionally
 * unauthenticated write in the app, per PRD §4/§6.1). Creates a PENDING
 * user + CooperatingTeacherProfile; nothing here is queryable or usable
 * until an admin approves it (see ct-approval-service.ts).
 *
 * The mockup's registration form (UI_FLOW_SPEC.md §1.2) has no password
 * field, and neither does PRD §6.1. Assumption: like supervisor/intern
 * provisioning, an initial password is generated server-side rather than
 * chosen by the registrant, since the account can't sign in until approved
 * anyway. Surfaced here rather than silently invented — flag for product
 * confirmation on how that initial password should actually reach the CT
 * (currently: nowhere yet, see PROGRESS.md).
 */
export async function registerCooperatingTeacher(input: CtRegistrationInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const temporaryPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const user = await prisma.user.create({
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
  });

  return user;
}
