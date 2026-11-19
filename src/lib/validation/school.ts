import { z } from "zod";

export const schoolTypeSchema = z.enum(["SECONDARY", "ELEMENTARY"]);

export const createSchoolSchema = z.object({
  name: z.string().trim().min(1, "School name is required").max(200),
  type: schoolTypeSchema,
  municipality: z.string().trim().min(1, "Municipality is required").max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  geofenceRadiusMeters: z.number().int().min(10).max(1000).default(75),
});

export const updateSchoolSchema = createSchoolSchema.partial();

// "HH:mm" 24h, or null to clear that override and fall back to the global default.
const optionalHhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm format")
  .nullable();

export const updateCheckInOverrideSchema = z.object({
  amTimeInCutoff: optionalHhmm,
  amTimeOutStart: optionalHhmm,
  pmTimeInCutoff: optionalHhmm,
  pmTimeOutStart: optionalHhmm,
  pmWindowOpensAt: optionalHhmm,
});
export type CheckInOverrideInput = z.infer<typeof updateCheckInOverrideSchema>;

export const assignSupervisorSchema = z.object({
  supervisorUserId: z.string().min(1, "Select a supervisor"),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
