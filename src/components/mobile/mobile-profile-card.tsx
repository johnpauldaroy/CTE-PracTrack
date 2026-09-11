"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SessionUser } from "@/lib/auth";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((p) => !/^(mr|ms|mrs|dr|prof)\.?$/i.test(p));
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || name.slice(0, 2).toUpperCase()
  );
}

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
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar className="size-12">
            <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
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
                <Input
                  id="m-current-pw"
                  type="password"
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
                <Input
                  id="m-new-pw"
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                {fieldErrors.newPassword && <p className="text-xs text-destructive">{fieldErrors.newPassword[0]}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="m-confirm-pw">Confirm New Password</Label>
                <Input
                  id="m-confirm-pw"
                  type="password"
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
