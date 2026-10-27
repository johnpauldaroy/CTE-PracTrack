"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const EMPTY = { name: "", schoolNumber: "", email: "", course: "", yearLevel: "", initialPassword: "" };

/**
 * Add Intern form. ADMIN picks the school; a SUPERVISOR's interns always go
 * to their own assigned school, which the server derives from the session.
 */
export function AddInternSheet({
  variant,
  open,
  onOpenChange,
  onSaved,
}: {
  variant: "admin" | "supervisor";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [schoolId, setSchoolId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: schoolsData } = useSWR<{ schools: { id: string; name: string }[] }>(
    variant === "admin" && open ? "/api/schools" : null,
    fetcher,
  );

  function handleOpenChange(next: boolean) {
    if (!next) {
      setForm(EMPTY);
      setSchoolId("");
      setFieldErrors({});
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch(variant === "admin" ? "/api/accounts/interns" : "/api/supervisor/interns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variant === "admin" ? { ...form, assignedSchoolId: schoolId } : form),
      });
      const result = await res.json();
      if (!res.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        toast.error(result.fieldErrors ? "Please fix the highlighted fields." : (result.error ?? "Could not add the intern."));
        return;
      }
      toast.success(`${form.name} added.`);
      handleOpenChange(false);
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  }

  function field(key: keyof typeof EMPTY, label: string, props: React.ComponentProps<typeof Input> = {}) {
    const id = `add-intern-${key}`;
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>{label}</Label>
        <Input
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
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add Intern</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4">
          {field("name", "Full Name", { placeholder: "Juan Dela Cruz" })}
          {field("schoolNumber", "School ID", { placeholder: "2021-0045" })}
          {field("email", "Institutional Email", { type: "email", placeholder: "yourname@antiquespride.edu.ph" })}
          {field("course", "Course", { placeholder: "BSEd-English" })}
          {field("yearLevel", "Year Level", { placeholder: "4th Year" })}

          {variant === "admin" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-intern-school">School</Label>
              <Select
                value={schoolId}
                onValueChange={(value) => setSchoolId(value ?? "")}
                items={Object.fromEntries((schoolsData?.schools ?? []).map((school) => [school.id, school.name]))}
              >
                <SelectTrigger id="add-intern-school" className="w-full">
                  <SelectValue placeholder="Select a school..." />
                </SelectTrigger>
                <SelectContent>
                  {schoolsData?.schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.assignedSchoolId && (
                <p className="text-xs text-destructive">{fieldErrors.assignedSchoolId[0]}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">The intern is assigned to your school automatically.</p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="add-intern-password">Initial Password</Label>
            <PasswordInput
              id="add-intern-password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.initialPassword}
              onChange={(e) => setForm((current) => ({ ...current, initialPassword: e.target.value }))}
            />
            {fieldErrors.initialPassword && (
              <p className="text-xs text-destructive">{fieldErrors.initialPassword[0]}</p>
            )}
            <p className="text-xs text-muted-foreground">Give this to the intern; they can change it from their Profile.</p>
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add Intern"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
