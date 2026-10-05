"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ProfileIdentity } from "@/components/profile/profile-identity";
import type { SessionUser } from "@/lib/auth";

export function MobileProfileCard({ user }: { user: SessionUser }) {
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
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-4">
          <ProfileIdentity user={user} />
        </CardContent>
      </Card>

      {!showChangePassword ? (
        <Button variant="outline" onClick={() => setShowChangePassword(true)}>
          Change Password
        </Button>
      ) : (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="m-current-pw">Current Password</Label>
                <PasswordInput
                  id="m-current-pw"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                {fieldErrors.currentPassword && (
                  <p className="text-xs text-destructive">{fieldErrors.currentPassword[0]}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="m-new-pw">New Password</Label>
                <PasswordInput
                  id="m-new-pw"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                {fieldErrors.newPassword && <p className="text-xs text-destructive">{fieldErrors.newPassword[0]}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="m-confirm-pw">Confirm New Password</Label>
                <PasswordInput
                  id="m-confirm-pw"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{fieldErrors.confirmPassword[0]}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowChangePassword(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Button variant="ghost" className="text-destructive" onClick={() => signOut({ callbackUrl: "/m/login" })}>
        Sign Out
      </Button>
    </div>
  );
}
