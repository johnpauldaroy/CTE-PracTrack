"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfilePhoto } from "@/components/profile/use-profile-photo";
import type { SessionUser } from "@/lib/auth";

const PHOTO_SIZE = 512;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((p) => !/^(mr|ms|mrs|dr|prof)\.?$/i.test(p));
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || name.slice(0, 2).toUpperCase()
  );
}

/** Centre-crops to a square and scales down, so a multi-megabyte phone photo uploads as a small JPEG. */
async function toSquareJpeg(file: File) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(side, PHOTO_SIZE);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Could not process the image.");
  return new File([blob], file.name.replace(/\.[^.]*$/, "") + ".jpg", { type: "image/jpeg" });
}

/** Name, email, and the account's own profile photo with upload / remove controls. */
export function ProfileIdentity({ user }: { user: SessionUser }) {
  const { url, mutate } = useProfilePhoto();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function send(method: "POST" | "DELETE", body?: FormData) {
    setBusy(true);
    try {
      const res = await fetch("/api/me/avatar", { method, body });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Could not update the photo.");
      await mutate(result, { revalidate: false });
      toast.success(method === "POST" ? "Profile photo updated." : "Profile photo removed.");
    } catch (error) {
      // fetch rejects with a TypeError when there is no connection.
      toast.error(error instanceof Error && !(error instanceof TypeError) ? error.message : "Could not update the photo. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let photo: File;
    try {
      photo = await toSquareJpeg(file);
    } catch {
      toast.error("That file is not an image this device can read. Use a JPG or PNG.");
      return;
    }
    const form = new FormData();
    form.set("file", photo);
    await send("POST", form);
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="relative shrink-0 rounded-full disabled:opacity-60"
        aria-label={url ? "Change profile photo" : "Upload profile photo"}
      >
        <Avatar className="size-16">
          {url && <AvatarImage src={url} alt="" />}
          <AvatarFallback className="bg-secondary text-lg font-semibold text-secondary-foreground">{initials(user.name)}</AvatarFallback>
        </Avatar>
        <span className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full border bg-card text-muted-foreground">
          <Camera className="size-3.5" />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{user.name}</p>
        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        <div className="mt-1 flex gap-3 text-xs font-medium">
          <button type="button" className="text-primary hover:underline" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Saving…" : url ? "Change photo" : "Upload photo"}
          </button>
          {url && !busy && (
            <button type="button" className="text-destructive hover:underline" onClick={() => send("DELETE")}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
