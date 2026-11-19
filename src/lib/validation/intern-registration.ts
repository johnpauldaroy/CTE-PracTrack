import { z } from "zod";

export const internRegistrationSchema = z
  .object({
    name: z.string().trim().min(1, "Full name is required").max(150),
    sectionId: z.string().min(1, "Select your section"),
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
  name: z.string().trim().min(1, "Section name is required").max(60),
  course: z.string().trim().min(1, "Course is required").max(80),
  yearLevel: z.string().trim().min(1, "Year level is required").max(30),
  isActive: z.boolean().optional(),
});

export type InternRegistrationInput = z.infer<typeof internRegistrationSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
