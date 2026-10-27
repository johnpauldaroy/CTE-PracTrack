import { z } from "zod";

export const ctRegistrationSchema = z
  .object({
    name: z.string().trim().min(1, "Full name is required").max(150),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone: z
      .string()
      .trim()
      .regex(/^09\d{9}$/, "Enter a valid PH mobile number (e.g. 09171234567)"),
    schoolId: z.string().min(1, "Select your school"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Re-enter your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type CtRegistrationInput = z.infer<typeof ctRegistrationSchema>;
