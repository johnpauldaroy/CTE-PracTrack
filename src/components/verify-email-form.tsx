"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/** Step 2 of intern registration: enter the 6-digit code that was emailed. */
export function VerifyEmailForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/intern-registration/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.fieldErrors?.code?.[0] ?? data.fieldErrors?.email?.[0] ?? data.error ?? "Could not verify the code.");
        return;
      }
      setDone(true);
    } catch {
      setError("No connection. Verification needs you to be online.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    const res = await fetch("/api/intern-registration/verify", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.fieldErrors?.code?.[0] ?? data.error ?? "Could not send a new code.");
      return;
    }
    toast.success("If that email is waiting for verification, a new code is on its way.");
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h2 className="text-lg font-semibold">Email verified</h2>
        <p className="text-sm text-muted-foreground">
          Your school&apos;s supervisor has been notified. You can sign in once they confirm your enrollment.
        </p>
        <Button render={<a href="/m/login" />} size="lg">
          Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleVerify} className="flex w-full flex-col gap-4">
      <p className="text-sm text-muted-foreground">Enter the 6-digit code we emailed you. It expires in 15 minutes.</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ve-email">Email</Label>
        <Input id="ve-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ve-code">Verification code</Label>
        <Input
          id="ve-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          placeholder="123456"
          className="text-center text-lg tracking-widest"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting || code.length !== 6}>
        {isSubmitting ? "Checking…" : "Verify email"}
      </Button>
      <button type="button" onClick={handleResend} className="text-sm font-medium text-secondary hover:underline">
        Send a new code
      </button>
      <a href="/m/login" className="text-center text-sm text-muted-foreground hover:underline">
        Back to Sign In
      </a>
    </form>
  );
}
