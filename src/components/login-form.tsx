"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

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
        setError(
          result?.code === "pending_approval"
            ? "Your account is awaiting approval by the CTE office."
            : "Incorrect email or password. Please try again.",
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
        <a href="/m/register" className="text-center text-sm font-medium text-secondary hover:underline">
          New cooperating teacher? Register here
        </a>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Forgot password?{" "}
        {variant === "admin" ? "Contact IT support." : "Contact the CTE office."}
      </p>
    </form>
  );
}
