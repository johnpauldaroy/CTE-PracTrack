import { z } from "zod";

// Raw device coordinates only. Never accept a client-computed "inside: true"
// flag (CLAUDE.md, PRD §9) — the geofence check happens entirely server-side.
export const attendancePunchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const markExcusedSchema = z.object({
  internId: z.string().min(1),
  shiftingId: z.string().min(1),
  date: z.coerce.date(),
  reason: z.string().trim().min(1, "A reason or reference is required").max(500),
});

export type AttendancePunchInput = z.infer<typeof attendancePunchSchema>;
export type MarkExcusedInput = z.infer<typeof markExcusedSchema>;
