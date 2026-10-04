import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use yyyy-MM-dd");
const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);

/** Audit Log filters, from the page's query string or the API's. */
export const auditLogFiltersSchema = z.object({
  action: z.preprocess(blankToUndefined, z.string().max(64).optional()),
  role: z.preprocess(blankToUndefined, z.enum(["ADMIN", "SUPERVISOR", "COOPERATING_TEACHER", "STUDENT_INTERN"]).optional()),
  from: z.preprocess(blankToUndefined, day.optional()),
  to: z.preprocess(blankToUndefined, day.optional()),
  q: z.preprocess(blankToUndefined, z.string().trim().max(100).optional()),
  page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(10_000).optional()),
});

export type AuditLogFiltersInput = z.infer<typeof auditLogFiltersSchema>;
