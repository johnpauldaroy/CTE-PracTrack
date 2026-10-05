import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { DOCUMENT_BUCKET, getSupabaseAdmin } from "@/lib/supabase-server";
import type { SessionUser } from "@/lib/auth";

const SIGNED_URL_SECONDS = 60 * 60;

// Self-service profile photo, available to every role. Always keyed on the
// session user — there is no way to read or write another account's photo here.

/** A short-lived URL for the caller's own photo, or null when none is set. */
export async function getOwnProfilePhotoUrl(actor: SessionUser) {
  const photo = await prisma.profilePhoto.findUnique({ where: { userId: actor.id } });
  if (!photo) return null;
  const { data, error } = await getSupabaseAdmin().storage.from(DOCUMENT_BUCKET).createSignedUrl(photo.storageKey, SIGNED_URL_SECONDS);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/** Upload or replace the caller's photo. `file` must already be validated; `ext` comes from that validation. */
export async function setOwnProfilePhoto(actor: SessionUser, file: File, ext: string) {
  const storage = getSupabaseAdmin().storage.from(DOCUMENT_BUCKET);
  // Not shifting-scoped like internship documents: the photo belongs to the account.
  const storageKey = `profile-photos/${actor.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await storage.upload(storageKey, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const data = { storageKey, originalFilename: file.name, mimeType: file.type, sizeBytes: file.size, uploadedAt: new Date() };
  const previous = await prisma.$transaction(async (tx) => {
    const previous = await tx.profilePhoto.findUnique({ where: { userId: actor.id } });
    await tx.profilePhoto.upsert({ where: { userId: actor.id }, update: data, create: { userId: actor.id, ...data } });
    await writeAuditLog(
      {
        actor,
        action: previous ? "PROFILE_PHOTO_REPLACE" : "PROFILE_PHOTO_UPLOAD",
        entityType: "User",
        entityId: actor.id,
        diff: { after: { filename: file.name, sizeBytes: file.size } },
      },
      tx,
    );
    return previous;
  });

  // The replaced object is no longer referenced; a failed cleanup only leaves an orphan.
  if (previous) await storage.remove([previous.storageKey]);
}

export async function removeOwnProfilePhoto(actor: SessionUser) {
  const previous = await prisma.$transaction(async (tx) => {
    const previous = await tx.profilePhoto.findUnique({ where: { userId: actor.id } });
    if (!previous) return null;
    await tx.profilePhoto.delete({ where: { userId: actor.id } });
    await writeAuditLog(
      {
        actor,
        action: "PROFILE_PHOTO_REMOVE",
        entityType: "User",
        entityId: actor.id,
        diff: { before: { filename: previous.originalFilename, sizeBytes: previous.sizeBytes } },
      },
      tx,
    );
    return previous;
  });
  if (previous) await getSupabaseAdmin().storage.from(DOCUMENT_BUCKET).remove([previous.storageKey]);
}
