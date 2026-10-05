"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ProfileIdentity } from "@/components/profile/profile-identity";
import type { SessionUser } from "@/lib/auth";

export function MyAccountTab({ user }: { user: SessionUser }) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        toast.error(data.error ?? "Could not change password.");
        return;
      }
      toast.success("Password changed.");
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <Card>
        <CardContent className="p-5">
          <ProfileIdentity user={user} />
        </CardContent>
      </Card>

      {!showChangePassword ? (
        <button
          type="button"
          onClick={() => setShowChangePassword(true)}
          className="flex items-center gap-2 border-t pt-4 text-sm font-medium text-secondary hover:underline"
        >
          <Lock className="size-4" />
          Change Password
        </button>
      ) : (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="current-pw">Current Password</Label>
                <PasswordInput
                  id="current-pw"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                {fieldErrors.currentPassword && (
                  <p className="text-xs text-destructive">{fieldErrors.currentPassword[0]}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-pw">New Password</Label>
                <PasswordInput
                  id="new-pw"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                {fieldErrors.newPassword && <p className="text-xs text-destructive">{fieldErrors.newPassword[0]}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-pw">Confirm New Password</Label>
                <PasswordInput
                  id="confirm-pw"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{fieldErrors.confirmPassword[0]}</p>
                )}
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Change Password"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowChangePassword(false)}>
                  <X /> Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
