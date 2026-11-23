import { z } from "zod";

// Admin correction-only edit (PRD §6.3: "Edit — for corrections only").
export const editInternAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  // Optional: self-registered interns may not have a school ID on file yet.
  schoolNumber: z.string().trim().max(30).optional().transform((value) => value || null),
  // Picking a section sets course + year level (and links the intern to it).
  sectionId: z.string().optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  assignedSchoolId: z.string().min(1, "Select a school"),
});

export const createSupervisorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  // A supervisor may cover several schools; a school has at most one supervisor.
  schoolIds: z.array(z.string().min(1)).default([]),
  initialPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const editSupervisorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  schoolIds: z.array(z.string().min(1)).default([]),
});

export const setSupervisorSchoolsSchema = z.object({
  schoolIds: z.array(z.string().min(1)).default([]),
});

export const approveSupervisorSchema = z.object({
  schoolIds: z.array(z.string().min(1)).default([]),
});

// Supervisor-scoped intern creation (PRD §6.4). A school sent by a supervisor
// is only accepted if it is one of the schools on their session (CLAUDE.md:
// never trust a client-supplied schoolId for a non-ADMIN caller).
export const createInternSchema = z.object({
  // Only needed when a supervisor covers several schools; verified against the session, never trusted.
  assignedSchoolId: z.string().optional(),
  name: z.string().trim().min(1, "Full name is required").max(150),
  schoolNumber: z.string().trim().min(1, "School ID is required").max(30),
  email: z.string().trim().toLowerCase().email("Enter a valid institutional email"),
  // Course and year level come from the section, so they cannot be mistyped.
  sectionId: z.string().min(1, "Select a section"),
  initialPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// Admin intern creation: same fields, plus the school (ADMIN has no session school).
export const adminCreateInternSchema = createInternSchema.extend({
  assignedSchoolId: z.string().min(1, "Select a school"),
});

// Admin-set password for a CT (e.g. a registration made before CTs chose
// their own password, or "Forgot password? Contact the CTE office").
export const setPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type EditInternAccountInput = z.infer<typeof editInternAccountSchema>;
export type CreateSupervisorInput = z.infer<typeof createSupervisorSchema>;
export type EditSupervisorInput = z.infer<typeof editSupervisorSchema>;
export type CreateInternInput = z.infer<typeof createInternSchema>;
export type AdminCreateInternInput = z.infer<typeof adminCreateInternSchema>;
