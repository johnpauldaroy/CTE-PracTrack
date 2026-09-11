import { z } from "zod";

export const ctRegistrationSchema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(150),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .regex(/^09\d{9}$/, "Enter a valid PH mobile number (e.g. 09171234567)"),
  schoolId: z.string().min(1, "Select your school"),
});

export type CtRegistrationInput = z.infer<typeof ctRegistrationSchema>;
