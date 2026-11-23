import { z } from "zod";
import { YEAR_LEVELS, normalizeCourse } from "@/lib/section-label";

export const internRegistrationSchema = z
  .object({
    name: z.string().trim().min(1, "Full name is required").max(150),
    schoolNumber: z.string().trim().min(1, "School ID No. is required").max(30, "School ID No. is too long"),
    sectionId: z.string().min(1, "Select your course, year & section"),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone: z
      .string()
      .trim()
      .regex(/^09\d{9}$/, "Enter a valid PH mobile number (e.g. 09171234567)"),
    schoolId: z.string().min(1, "Select the school where you will practice teach"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Re-enter your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const resendCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export const rejectEnrollmentSchema = z.object({
  reason: z.string().trim().min(1, "Give a short reason").max(300),
});

export const sectionSchema = z.object({
  // The section letter only ("A"); the full label ("BSED-MATH 4A") is built from course + year + section.
  name: z
    .string()
    .trim()
    .min(1, "Section is required")
    .max(10, "Section is too long (e.g. A, B, C1)")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters or numbers only (e.g. A)")
    .transform((value) => value.toUpperCase()),
  course: z.string().trim().min(1, "Course is required").max(80).transform(normalizeCourse),
  yearLevel: z.enum(YEAR_LEVELS, { message: "Select a year level" }),
  isActive: z.boolean().optional(),
});

export type InternRegistrationInput = z.infer<typeof internRegistrationSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
