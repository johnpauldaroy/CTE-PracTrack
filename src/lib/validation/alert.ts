import { z } from "zod";
/** A resolution note is the supervisor's explanation to the CTE office, so it must say something. */
export const resolveAlertSchema = z.object({ note: z.string().trim().min(10, "Write at least a short sentence (10 characters).").max(2000) });
