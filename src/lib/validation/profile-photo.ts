export const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;

/** Accepted mime type → file signature (magic bytes) check and storage extension. */
const PROFILE_PHOTO_TYPES: Record<string, { ext: string; matches: (b: Uint8Array) => boolean }> = {
  "image/jpeg": { ext: "jpg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
};

/**
 * Throws unless the file is a JPG or PNG no larger than 2 MB (the types the
 * storage bucket allows; the profile screen converts any picked image to JPG). The
 * content is checked against the declared type, since the mime type is
 * client-supplied. Returns the extension to store it under.
 */
export async function validateProfilePhotoFile(file: File) {
  const type = PROFILE_PHOTO_TYPES[file.type];
  if (!type) throw new Error("Only JPG and PNG images are accepted.");
  if (file.size <= 0 || file.size > MAX_PROFILE_PHOTO_BYTES) throw new Error("The photo must be no larger than 2 MB.");
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!type.matches(head)) throw new Error("The file is not a valid image.");
  return type.ext;
}
