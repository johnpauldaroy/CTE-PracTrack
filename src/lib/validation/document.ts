import { z } from "zod";
export const sessionDocumentMetadataSchema = z.object({ sessionId: z.string().min(1), type: z.enum(["LESSON_PLAN", "PROGRESS_REPORT"]) });
export const endSubmissionMetadataSchema = z.object({ type: z.enum(["NARRATIVE_REPORT", "TEACHING_PORTFOLIO"]), dueDate: z.coerce.date() });
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
export function validateDocumentFile(file: File) { if (!ACCEPTED_DOCUMENT_TYPES.has(file.type)) throw new Error("Only PDF, JPG, and PNG files are accepted."); if (file.size <= 0 || file.size > MAX_DOCUMENT_BYTES) throw new Error("The file must be no larger than 10 MB."); }
