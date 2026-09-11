"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface SchoolOption {
  id: string;
  name: string;
  type: "SECONDARY" | "ELEMENTARY";
}

export function CtRegistrationForm() {
  const router = useRouter();
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/public/schools")
      .then((res) => res.json())
      .then((data) => setSchools(data.schools ?? []))
      .catch(() => toast.error("Could not load the school list. Please refresh."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/ct-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, schoolId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        toast.error(data.error ?? "Registration failed.");
        return;
      }
      toast.success("Registration submitted. The CTE office will review your account.");
      router.push("/m/login");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="ct-name">Full Name</Label>
        <Input
          id="ct-name"
          required
          placeholder="Mr./Ms. Juan Dela Cruz"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ct-email">Email</Label>
        <Input
          id="ct-email"
          type="email"
          required
          placeholder="yourname@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ct-phone">Phone Number</Label>
        <Input
          id="ct-phone"
          required
          placeholder="0917XXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone[0]}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ct-school">School</Label>
        <Select value={schoolId} onValueChange={(value) => setSchoolId(value ?? "")}>
          <SelectTrigger id="ct-school" className="w-full">
            <SelectValue placeholder="Select your school..." />
          </SelectTrigger>
          <SelectContent>
            {schools.map((school) => (
              <SelectItem key={school.id} value={school.id}>
                {school.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.schoolId && <p className="text-xs text-destructive">{fieldErrors.schoolId[0]}</p>}
      </div>

      <Button
        type="submit"
        variant="secondary"
        size="lg"
        className="mt-2 w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting…" : "Submit Registration"}
      </Button>

      <a href="/m/login" className="text-center text-sm text-muted-foreground hover:underline">
        Back to Sign In
      </a>
    </form>
  );
}
