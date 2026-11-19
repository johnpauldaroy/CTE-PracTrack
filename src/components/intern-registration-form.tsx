"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface SectionOption {
  id: string;
  name: string;
  course: string;
  yearLevel: string;
}
interface SchoolOption {
  id: string;
  name: string;
}

/** Public intern sign-up: step 1 of 3 (register → verify email → supervisor confirms). */
export function InternRegistrationForm() {
  const router = useRouter();
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [name, setName] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/public/sections").then((r) => r.json()), fetch("/api/public/schools").then((r) => r.json())])
      .then(([sectionData, schoolData]) => {
        setSections(sectionData.sections ?? []);
        setSchools(schoolData.schools ?? []);
      })
      .catch(() => toast.error("Could not load the section and school lists. Please refresh."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/intern-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sectionId, email, phone, schoolId, password, confirmPassword, website }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        toast.error(data.error ?? "Registration failed.");
        return;
      }
      toast.success("Check your email for the verification code.");
      router.push(`/m/register/verify?email=${encodeURIComponent(email)}`);
    } catch {
      toast.error("No connection. Registration needs you to be online.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const error = (key: string) => fieldErrors[key] && <p className="text-xs text-destructive">{fieldErrors[key][0]}</p>;

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="in-name">Full Name</Label>
        <Input id="in-name" required placeholder="Juan Dela Cruz" value={name} onChange={(e) => setName(e.target.value)} />
        {error("name")}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="in-section">Section</Label>
        <Select
          value={sectionId}
          onValueChange={(value) => setSectionId(value ?? "")}
          items={Object.fromEntries(sections.map((s) => [s.id, s.name]))}
        >
          <SelectTrigger id="in-section" className="w-full">
            <SelectValue placeholder="Select your section..." />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                {section.name} · {section.course}, {section.yearLevel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error("sectionId")}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="in-email">Email</Label>
        <Input
          id="in-email"
          type="email"
          required
          autoComplete="email"
          placeholder="yourname@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">We will email you a code to verify it.</p>
        {error("email")}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="in-phone">Contact Number</Label>
        <Input id="in-phone" required placeholder="0917XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {error("phone")}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="in-school">School</Label>
        <Select
          value={schoolId}
          onValueChange={(value) => setSchoolId(value ?? "")}
          items={Object.fromEntries(schools.map((s) => [s.id, s.name]))}
        >
          <SelectTrigger id="in-school" className="w-full">
            <SelectValue placeholder="Where will you practice teach?" />
          </SelectTrigger>
          <SelectContent>
            {schools.map((school) => (
              <SelectItem key={school.id} value={school.id}>
                {school.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error("schoolId")}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="in-password">Password</Label>
        <PasswordInput
          id="in-password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error("password")}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="in-confirm">Confirm Password</Label>
        <PasswordInput
          id="in-confirm"
          required
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error("confirmPassword")}
      </div>

      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        After you verify your email, your school&apos;s supervisor confirms your enrollment before you can sign in.
      </p>

      <Button type="submit" variant="secondary" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Register"}
      </Button>

      <a href="/m/login" className="text-center text-sm text-muted-foreground hover:underline">
        Back to Sign In
      </a>
    </form>
  );
}
