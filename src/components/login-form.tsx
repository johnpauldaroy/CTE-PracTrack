"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type MobileRole = "STUDENT_INTERN" | "SUPERVISOR" | "COOPERATING_TEACHER";

const ROLE_TABS: { value: MobileRole; label: string }[] = [
  { value: "STUDENT_INTERN", label: "Student Intern" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "COOPERATING_TEACHER", label: "Cooperating Teacher" },
];

interface LoginFormProps {
  variant: "admin" | "mobile";
  /** role -> destination path. Falls back to "/" if the resolved role has no entry. */
  roleHomeMap: Record<string, string>;
}

export function LoginForm({ variant, roleHomeMap }: LoginFormProps) {
  const router = useRouter();
  const [role, setRole] = useState<MobileRole>("STUDENT_INTERN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const effectiveRole = variant === "admin" ? "ADMIN" : role;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        role: effectiveRole,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Incorrect email, password, or role. Please try again.");
        return;
      }

      router.push(roleHomeMap[effectiveRole] ?? "/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      {variant === "mobile" && (
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setRole(tab.value)}
              className={cn(
                "rounded-md px-2 py-2 text-xs font-medium transition-colors sm:text-sm",
                role === tab.value
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

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
        <Input
          id="password"
          type="password"
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

      {variant === "mobile" && role === "COOPERATING_TEACHER" && (
        <a href="/m/register" className="text-center text-sm font-medium text-secondary hover:underline">
          New here? Register as Cooperating Teacher
        </a>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Forgot password?{" "}
        {variant === "admin" ? "Contact IT support." : "Contact the CTE office."}
      </p>
    </form>
  );
}
