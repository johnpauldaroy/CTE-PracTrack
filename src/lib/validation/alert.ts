import { z } from "zod";
export const resolveAlertSchema = z.object({ note: z.string().trim().min(3).max(2000) });
