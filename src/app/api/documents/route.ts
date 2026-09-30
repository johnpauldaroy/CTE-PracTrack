import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { listDocuments, uploadSessionDocument } from "@/lib/services/document-service";
import { sessionDocumentMetadataSchema, validateDocumentFile } from "@/lib/validation/document";
export async function GET() { try { return NextResponse.json(await listDocuments(await requireSession())); } catch (error) { return toApiErrorResponse(error); } }
export async function POST(request: NextRequest) { try { const actor = await requireSession(); const form = await request.formData(); const metadata = sessionDocumentMetadataSchema.parse({ sessionId: form.get("sessionId"), type: form.get("type") }); const file = form.get("file"); if (!(file instanceof File)) throw new Error("A file is required."); validateDocumentFile(file); return NextResponse.json({ document: await uploadSessionDocument(actor, metadata.sessionId, metadata.type, file) }, { status: 201 }); } catch (error) { return toApiErrorResponse(error); } }
