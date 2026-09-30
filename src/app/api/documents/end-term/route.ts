import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { uploadEndSubmission } from "@/lib/services/document-service";
import { endSubmissionMetadataSchema, validateDocumentFile } from "@/lib/validation/document";
export async function POST(request: NextRequest) { try { const actor = await requireSession(); const form = await request.formData(); const metadata = endSubmissionMetadataSchema.parse({ type: form.get("type"), dueDate: form.get("dueDate") }); const file = form.get("file"); if (!(file instanceof File)) throw new Error("A file is required."); validateDocumentFile(file); return NextResponse.json({ submission: await uploadEndSubmission(actor, metadata.type, metadata.dueDate, file) }, { status: 201 }); } catch (error) { return toApiErrorResponse(error); } }
