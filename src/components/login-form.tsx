"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

/** What a correct password but a not-yet-usable account should be told (the code comes from auth.ts). */
const SIGN_IN_MESSAGES: Record<string, string> = {
  pending_approval: "Your account is awaiting approval by the CTE office.",
  account_locked: "Your account is locked by the CTE office. Please contact them if you need access.",
  enrollment_pending: "Your email is verified. Your school's supervisor still has to confirm your enrollment.",
  enrollment_rejected: "Your enrollment was not confirmed. Please contact your supervisor or the CTE office.",
};

interface LoginFormProps {
  variant: "admin" | "mobile";
}

/**
 * One sign-in form for every role. There is no role picker: the account's
 * role decides the destination, and "/" redirects each role to its home.
 */
export function LoginForm({ variant }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        if (result?.code === "email_not_verified") {
          router.push(`/m/register/verify?email=${encodeURIComponent(email)}`);
          return;
        }
        setError(
          SIGN_IN_MESSAGES[result?.code ?? ""] ?? "Incorrect email or password. Please try again.",
        );
        return;
      }

      router.replace("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder={variant === "admin" ? "admin@antiquespride.edu.ph" : "yourname@antiquespride.edu.ph"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign In"}
      </Button>

      {variant === "mobile" && (
        <div className="flex flex-col items-center gap-1 text-sm">
          <span className="text-muted-foreground">New here? Register as</span>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 font-medium text-secondary">
            <a href="/m/register/intern" className="hover:underline">
              Intern
            </a>
            <a href="/m/register" className="hover:underline">
              Cooperating Teacher
            </a>
            <a href="/m/register/supervisor" className="hover:underline">
              Supervisor
            </a>
          </div>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Forgot password?{" "}
        {variant === "admin" ? "Contact IT support." : "Contact the CTE office."}
      </p>
    </form>
  );
}
