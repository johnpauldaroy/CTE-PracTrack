import { z } from "zod";

// Admin correction-only edit (PRD §6.3: "Edit — for corrections only").
export const editInternAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  schoolNumber: z.string().trim().min(1, "School ID is required").max(30),
  course: z.string().trim().min(1, "Course is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  assignedSchoolId: z.string().min(1, "Select a school"),
});

export const createSupervisorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  department: z.string().trim().min(1, "Department is required").max(120),
  schoolId: z.string().optional().nullable(),
  initialPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const editSupervisorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  department: z.string().trim().min(1, "Department is required").max(120),
  schoolId: z.string().optional().nullable(),
});

// Supervisor-scoped intern creation (PRD §6.4). schoolId is NEVER accepted
// from the request — it's always the supervisor's own assigned school,
// derived from the session (CLAUDE.md: never trust a client-supplied
// schoolId for a non-ADMIN caller).
export const createInternSchema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(150),
  schoolNumber: z.string().trim().min(1, "School ID is required").max(30),
  email: z.string().trim().toLowerCase().email("Enter a valid institutional email"),
  course: z.string().trim().min(1, "Course is required").max(80),
  yearLevel: z.string().trim().min(1, "Year level is required").max(30),
  initialPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type EditInternAccountInput = z.infer<typeof editInternAccountSchema>;
export type CreateSupervisorInput = z.infer<typeof createSupervisorSchema>;
export type EditSupervisorInput = z.infer<typeof editSupervisorSchema>;
export type CreateInternInput = z.infer<typeof createInternSchema>;
