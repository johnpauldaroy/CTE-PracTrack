"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Admin sets a CT's password, to be handed over in person (audited, never logged). */
export function SetCtPasswordDialog({
  ct,
  onOpenChange,
}: {
  ct: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPassword("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!ct) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounts/cts/${ct.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.fieldErrors?.password?.[0] ?? data.error ?? "Could not set the password.");
        return;
      }
      toast.success(`New password set for ${ct.name}.`);
      handleOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={!!ct} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Set password for {ct?.name}</DialogTitle>
            <DialogDescription>
              Give this password to the cooperating teacher directly. They can change it later from their Profile.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ct-new-password">New password</Label>
            <PasswordInput
              id="ct-new-password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Set password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
