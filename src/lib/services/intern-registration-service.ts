import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { assertEmailDeliverable } from "@/lib/email-check";
import { writeAuditLog } from "@/lib/audit";
import { FieldValidationError } from "@/lib/session";
import { assertEmailAvailable, sendEmail } from "@/lib/email";
import type { InternRegistrationInput } from "@/lib/validation/intern-registration";
import type { Prisma } from "@/generated/prisma/client";

const CODE_TTL_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;

/** A generic failure so a wrong email, a wrong code and an expired code are indistinguishable from outside. */
const INVALID_CODE = new FieldValidationError({ code: ["That code is not valid or has expired. Request a new one."] });

function newCode() {
  return String(randomInt(100000, 1_000_000));
}

async function issueCode(userId: string, email: string, name: string) {
  const code = newCode();
  // Only the latest code is valid: retire any earlier ones first.
  await prisma.emailVerification.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.emailVerification.create({
    data: { userId, codeHash: await bcrypt.hash(code, 8), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });
  await sendEmail({
    to: email,
    subject: "Your CTE PracTrack verification code",
    text: `Hi ${name},\n\nYour verification code is ${code}. It expires in 15 minutes.\n\nIf you did not register for CTE PracTrack, ignore this email.`,
  });
}

/**
 * Public intern self-registration (no session). Creates a PENDING account whose
 * course/year level come from the chosen section, then emails a verification code.
 * Nothing is usable until the email is verified AND the school's supervisor confirms
 * the enrollment (enrollment-service.ts).
 */
export async function registerIntern(input: InternRegistrationInput) {
  assertEmailAvailable();
  await assertEmailDeliverable(input.email);

  const [existing, section, school] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.section.findFirst({ where: { id: input.sectionId, isActive: true } }),
    prisma.school.findFirst({ where: { id: input.schoolId, deletedAt: null } }),
  ]);
  // A registration whose email was never verified (for example the code email failed to send) can be
  // started again: it cannot sign in, so refreshing its details and sending a new code is safe.
  const resumable =
    !!existing &&
    existing.role === "STUDENT_INTERN" &&
    existing.status === "PENDING" &&
    !existing.emailVerifiedAt &&
    !existing.deletedAt;
  const errors: Record<string, string[]> = {};
  if (existing && !resumable) errors.email = ["An account with this email already exists."];
  if (school) {
    // One School ID No. per school (a deleted intern's number is freed when the account is deleted).
    const numberTaken = await prisma.internProfile.findFirst({
      where: { assignedSchoolId: school.id, schoolNumber: input.schoolNumber, ...(existing ? { NOT: { userId: existing.id } } : {}) },
      select: { id: true },
    });
    if (numberTaken) errors.schoolNumber = ["This School ID No. is already registered at that school."];
  }
  if (!section) errors.sectionId = ["Select a section from the list"];
  if (!school) errors.schoolId = ["Select a school from the list"];
  if (Object.keys(errors).length) throw new FieldValidationError(errors);

  const passwordHash = await bcrypt.hash(input.password, 10);

  if (resumable && existing) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: existing.id }, data: { name: input.name, phone: input.phone, passwordHash } });
      await tx.internProfile.update({
        where: { userId: existing.id },
        data: {
          schoolNumber: input.schoolNumber,
          course: section!.course,
          yearLevel: section!.yearLevel,
          sectionId: section!.id,
          assignedSchoolId: school!.id,
          enrollmentStatus: "PENDING",
          rejectionReason: null,
        },
      });
    });
    await issueCode(existing.id, existing.email, input.name);
    return { email: existing.email };
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: "STUDENT_INTERN",
        status: "PENDING",
        name: input.name,
        phone: input.phone,
      },
    });
    const profile = await tx.internProfile.create({
      data: {
        userId: created.id,
        schoolNumber: input.schoolNumber,
        course: section!.course,
        yearLevel: section!.yearLevel,
        sectionId: section!.id,
        assignedSchoolId: school!.id,
        enrollmentStatus: "PENDING",
        // A self-registered intern is the creator of their own record.
        createdByUserId: created.id,
      },
    });
    await writeAuditLog(
      {
        actor: { id: created.id, email: created.email, name: created.name, role: "STUDENT_INTERN" },
        action: "INTERN_REGISTER",
        entityType: "InternProfile",
        entityId: profile.id,
        diff: {
          after: { name: input.name, email: input.email, schoolNumber: input.schoolNumber, sectionId: section!.id, schoolId: school!.id },
        } as unknown as Prisma.InputJsonValue,
      },
      tx,
    );
    return created;
  });

  await issueCode(user.id, user.email, user.name);
  return { email: user.email };
}

/** Sends a fresh code (at most one per minute). Answers the same way whether or not the email exists. */
export async function resendVerificationCode(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { emailVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!user || user.role !== "STUDENT_INTERN" || user.emailVerifiedAt || user.deletedAt) return;
  const last = user.emailVerifications[0];
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new FieldValidationError({ code: ["Please wait a minute before asking for another code."] });
  }
  assertEmailAvailable();
  await issueCode(user.id, user.email, user.name);
}

/** Checks the emailed code, marks the email verified, and hands the request to the school's supervisor (or admin). */
export async function verifyInternEmail(email: string, code: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      internProfile: { include: { assignedSchool: { select: { id: true, name: true } } } },
      emailVerifications: { where: { usedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!user || user.role !== "STUDENT_INTERN" || !user.internProfile || user.deletedAt) throw INVALID_CODE;
  if (user.emailVerifiedAt) return { alreadyVerified: true };

  const record = user.emailVerifications[0];
  if (!record || record.expiresAt.getTime() < Date.now() || record.attempts >= MAX_ATTEMPTS) throw INVALID_CODE;

  const matches = await bcrypt.compare(code, record.codeHash);
  if (!matches) {
    await prisma.emailVerification.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw INVALID_CODE;
  }

  const profile = user.internProfile;
  const school = profile.assignedSchool;
  await prisma.$transaction(async (tx) => {
    await tx.emailVerification.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });

    // Route the confirmation request: the school's supervisor, or the CTE office if the school has none yet.
    const supervisors = await tx.user.findMany({
      where: {
        role: "SUPERVISOR",
        status: "ACTIVE",
        deletedAt: null,
        supervisorProfile: { schools: { some: { schoolId: school.id } } },
      },
      select: { id: true },
    });
    const recipients = supervisors.length
      ? supervisors
      : await tx.user.findMany({ where: { role: "ADMIN", status: "ACTIVE", deletedAt: null }, select: { id: true } });
    if (recipients.length) {
      await tx.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.id,
          type: "INTERN_ENROLLMENT_PENDING" as const,
          title: "New enrollment request",
          body: `${user.name} registered for ${school.name} and is waiting for your confirmation.`,
          href: supervisors.length ? "/m/supervisor/enrollments" : "/accounts?tab=interns",
        })),
      });
    }

    await writeAuditLog(
      {
        actor: { id: user.id, email: user.email, name: user.name, role: "STUDENT_INTERN" },
        action: "INTERN_EMAIL_VERIFY",
        entityType: "InternProfile",
        entityId: profile.id,
      },
      tx,
    );
  });

  return { alreadyVerified: false };
}
