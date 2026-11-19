import { z } from "zod";

const dateOnly = z.coerce.date();

/** The admin's full list of reporting windows for a shifting (replaces the previous list). */
export const configureProgressPeriodsSchema = z.object({
  periods: z
    .array(
      z
        .object({
          id: z.string().min(1).optional(),
          label: z.string().trim().min(1, "Give each period a label").max(60),
          startDate: dateOnly,
          endDate: dateOnly,
          dueDate: dateOnly,
        })
        .refine((p) => p.endDate >= p.startDate, { message: "End date must not be before the start date", path: ["endDate"] })
        .refine((p) => p.dueDate >= p.startDate, { message: "Due date must not be before the start date", path: ["dueDate"] }),
    )
    .max(60, "At most 60 periods"),
});

/** Generates back-to-back periods of `everyDays` days from the shifting start to its end. */
export const generateProgressPeriodsSchema = z.object({
  everyDays: z.number().int().min(1).max(60),
});

export type ConfigureProgressPeriodsInput = z.infer<typeof configureProgressPeriodsSchema>;
