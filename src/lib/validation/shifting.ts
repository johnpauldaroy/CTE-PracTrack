import { z } from "zod";

export const createSemesterSchema = z.object({
  academicYearLabel: z.string().trim().min(1, "Academic year is required").max(20),
  name: z.string().trim().min(1, "Semester name is required").max(60),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const configureShiftingSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    requiredTeachingSessions: z.number().int().min(1).max(100),
    requiredFinalDemos: z.number().int().min(0).max(10),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export type CreateSemesterInput = z.infer<typeof createSemesterSchema>;
export type ConfigureShiftingInput = z.infer<typeof configureShiftingSchema>;
