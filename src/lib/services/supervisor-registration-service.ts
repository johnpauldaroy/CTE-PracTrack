import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { FieldValidationError } from "@/lib/session";
import { notifyAdmins } from "@/lib/services/notification-service";
import type { SupervisorRegistrationInput } from "@/lib/validation/supervisor-registration";

/**
 * Public self-registration for supervisors / faculty (no session). Creates a PENDING
 * user + SupervisorProfile with no school: nothing is usable until an admin approves
 * the account and assigns the school(s) (see account-service.approveSupervisor).
 * Sign-in stays blocked until then ("awaiting approval").
 */
export async function registerSupervisor(input: SupervisorRegistrationInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new FieldValidationError({ email: ["An account with this email already exists."] });

  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: "SUPERVISOR",
        status: "PENDING",
        name: input.name,
        phone: input.phone,
        supervisorProfile: { create: { department: input.department } },
      },
    });

    // The registrant is the actor of their own (unauthenticated) registration.
    await writeAuditLog(
      {
        actor: { id: user.id, email: user.email, name: user.name, role: "SUPERVISOR" },
        action: "SUPERVISOR_REGISTER",
        entityType: "User",
        entityId: user.id,
        diff: { after: { name: input.name, email: input.email, department: input.department } },
      },
      tx,
    );

    await notifyAdmins(
      {
        type: "SUPERVISOR_REGISTRATION_PENDING",
        title: "New supervisor registration",
        body: `${user.name} (${input.department}) is waiting for approval and a school assignment.`,
        href: "/accounts?tab=supervisors",
      },
      tx,
    );

    return user;
  });
}
