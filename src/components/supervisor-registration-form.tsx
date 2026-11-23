"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const EMPTY = { name: "", email: "", phone: "", password: "", confirmPassword: "" };

/** Public sign-up for supervisors / faculty. The CTE office approves it and assigns the school(s). */
export function SupervisorRegistrationForm() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [website, setWebsite] = useState(""); // honeypot: hidden from people, filled by bots
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/supervisor-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        toast.error(data.error ?? "Registration failed.");
        return;
      }
      toast.success("Registration submitted. The CTE office will review it and assign your school.");
      router.push("/m/login");
    } catch {
      toast.error("No connection. Registration needs you to be online.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function field(
    key: keyof typeof EMPTY,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
    Control: typeof Input | typeof PasswordInput = Input,
  ) {
    const id = `sup-reg-${key}`;
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Control
          id={id}
          required
          value={form[key]}
          onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
          {...props}
        />
        {fieldErrors[key] && <p className="text-xs text-destructive">{fieldErrors[key][0]}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      {field("name", "Full Name", { placeholder: "Prof. Juan Dela Cruz" })}
      {field("email", "Email", { type: "email", placeholder: "yourname@antiquespride.edu.ph" })}
      {field("phone", "Phone Number", { placeholder: "0917XXXXXXX" })}
      {field("password", "Password", { minLength: 8, autoComplete: "new-password", placeholder: "At least 8 characters" }, PasswordInput)}
      {field("confirmPassword", "Confirm Password", { autoComplete: "new-password", placeholder: "Re-enter your password" }, PasswordInput)}
      <p className="text-xs text-muted-foreground">
        You can sign in once the CTE office approves your account and assigns your school(s).
      </p>

      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <Button type="submit" variant="secondary" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Submit Registration"}
      </Button>

      <a href="/m/login" className="text-center text-sm text-muted-foreground hover:underline">
        Back to Sign In
      </a>
    </form>
  );
}
