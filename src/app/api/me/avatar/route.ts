import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { toApiErrorResponse } from "@/lib/api-error";
import { validateProfilePhotoFile } from "@/lib/validation/profile-photo";
import { getOwnProfilePhotoUrl, removeOwnProfilePhoto, setOwnProfilePhoto } from "@/lib/services/profile-photo-service";

export async function GET() {
  try {
    return NextResponse.json({ url: await getOwnProfilePhotoUrl(await requireSession()) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) throw new Error("A photo is required.");
    const ext = await validateProfilePhotoFile(file);
    await setOwnProfilePhoto(user, file, ext);
    return NextResponse.json({ url: await getOwnProfilePhotoUrl(user) }, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    await removeOwnProfilePhoto(await requireSession());
    return NextResponse.json({ url: null });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
