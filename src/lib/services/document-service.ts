import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { scopeToRole } from "@/lib/scope";
import { ForbiddenError } from "@/lib/session";
import { DOCUMENT_BUCKET, getSupabaseAdmin } from "@/lib/supabase-server";
import type { SessionUser } from "@/lib/auth";
import type { SessionDocumentType, EndOfTermSubmissionType, Prisma } from "@/generated/prisma/client";

function safeFilename(name: string) { return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120); }
async function uploadObject(key: string, file: File) { const bytes = new Uint8Array(await file.arrayBuffer()); const { error } = await getSupabaseAdmin().storage.from(DOCUMENT_BUCKET).upload(key, bytes, { contentType: file.type, upsert: false }); if (error) throw new Error(`Storage upload failed: ${error.message}`); }

export async function listDocuments(actor: SessionUser) {
  const sessions = await prisma.teachingSession.findMany({ where: scopeToRole.session(actor), include: { documents: { where: { supersededByDocumentId: null }, orderBy: { uploadedAt: "desc" } }, evaluation: { select: { overallScore: true } } }, orderBy: { sessionNumber: "desc" } });
  const activeShifting = await prisma.shifting.findFirst({ where: { status: "ACTIVE" } });
  const endSubmissions = actor.internProfileId && activeShifting ? await prisma.endOfTermSubmission.findMany({ where: { ...scopeToRole.endOfTermSubmission(actor), shiftingId: activeShifting.id } }) : [];
  return { sessions, endSubmissions };
}

export async function uploadSessionDocument(actor: SessionUser, sessionId: string, type: SessionDocumentType, file: File) {
  if (actor.role !== "STUDENT_INTERN" || !actor.internProfileId) throw new ForbiddenError("Only an intern can upload their session documents.");
  const session = await prisma.teachingSession.findFirst({ where: { ...scopeToRole.session(actor), id: sessionId } });
  if (!session) throw new ForbiddenError("Session is outside your scope.");
  const key = `${actor.internProfileId}/${session.shiftingId}/sessions/${sessionId}/${type.toLowerCase()}-${crypto.randomUUID()}-${safeFilename(file.name)}`;
  await uploadObject(key, file);
  return prisma.$transaction(async (tx) => {
    const previous = await tx.sessionDocument.findFirst({ where: { sessionId, type, supersededByDocumentId: null }, orderBy: { uploadedAt: "desc" } });
    const document = await tx.sessionDocument.create({ data: { sessionId, type, storageKey: key, originalFilename: file.name, mimeType: file.type, sizeBytes: file.size } });
    if (previous) await tx.sessionDocument.update({ where: { id: previous.id }, data: { supersededByDocumentId: document.id } });
    await writeAuditLog({ actor, action: previous ? "DOCUMENT_REPLACE" : "DOCUMENT_UPLOAD", entityType: "SessionDocument", entityId: document.id, diff: { after: { sessionId, type, filename: file.name, sizeBytes: file.size } } as Prisma.InputJsonValue }, tx);
    return document;
  });
}

export async function uploadEndSubmission(actor: SessionUser, type: EndOfTermSubmissionType, dueDate: Date, file: File) {
  if (actor.role !== "STUDENT_INTERN" || !actor.internProfileId) throw new ForbiddenError("Only an intern can upload end-of-term submissions.");
  const shifting = await prisma.shifting.findFirst({ where: { status: "ACTIVE" } }); if (!shifting) throw new Error("There is no active shifting.");
  const key = `${actor.internProfileId}/${shifting.id}/end-term/${type.toLowerCase()}-${crypto.randomUUID()}-${safeFilename(file.name)}`; await uploadObject(key, file);
  return prisma.$transaction(async (tx) => { const submission = await tx.endOfTermSubmission.upsert({ where: { internId_shiftingId_type: { internId: actor.internProfileId!, shiftingId: shifting.id, type } }, update: { dueDate, storageKey: key, originalFilename: file.name, mimeType: file.type, sizeBytes: file.size, uploadedAt: new Date() }, create: { internId: actor.internProfileId!, shiftingId: shifting.id, type, dueDate, storageKey: key, originalFilename: file.name, mimeType: file.type, sizeBytes: file.size, uploadedAt: new Date() } }); await writeAuditLog({ actor, action: "END_SUBMISSION_UPLOAD", entityType: "EndOfTermSubmission", entityId: submission.id, diff: { after: { type, filename: file.name } } as Prisma.InputJsonValue }, tx); return submission; });
}

export async function getDocumentUrl(actor: SessionUser, documentId: string, kind: "session" | "end") {
  let key: string | null = null;
  if (kind === "session") key = (await prisma.sessionDocument.findFirst({ where: { ...scopeToRole.sessionDocument(actor), id: documentId } }))?.storageKey ?? null;
  else key = (await prisma.endOfTermSubmission.findFirst({ where: { ...scopeToRole.endOfTermSubmission(actor), id: documentId } }))?.storageKey ?? null;
  if (!key) throw new ForbiddenError("Document is outside your scope.");
  const { data, error } = await getSupabaseAdmin().storage.from(DOCUMENT_BUCKET).createSignedUrl(key, 300); if (error) throw new Error(error.message); return data.signedUrl;
}
