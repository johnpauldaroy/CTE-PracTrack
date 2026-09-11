"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type SheetMode = { mode: "add" } | { mode: "edit"; id: string } | null;

interface SupervisorDetail {
  id: string;
  department: string;
  schoolId: string | null;
  user: { name: string; email: string };
}

interface SchoolOption {
  id: string;
  name: string;
}

export function SupervisorFormSheet({
  mode,
  onOpenChange,
  onSaved,
}: {
  mode: SheetMode;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = mode?.mode === "edit";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [schoolId, setSchoolId] = useState<string>("");
  const [initialPassword, setInitialPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  useSWR<{ supervisors: SupervisorDetail[] }>(
    isEdit ? "/api/accounts/supervisors" : null,
    fetcher,
    {
      onSuccess: ({ supervisors }) => {
        if (mode?.mode !== "edit") return;
        const editing = supervisors.find((supervisor) => supervisor.id === mode.id);
        if (!editing) return;
        setName(editing.user.name);
        setEmail(editing.user.email);
        setDepartment(editing.department);
        setSchoolId(editing.schoolId ?? "");
      },
      revalidateOnFocus: false,
    },
  );
  const { data: schoolsData } = useSWR<{ schools: SchoolOption[] }>("/api/schools", fetcher);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setName("");
      setEmail("");
      setDepartment("");
      setSchoolId("");
      setInitialPassword("");
      setFieldErrors({});
    }
    onOpenChange(open);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mode) return;
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/accounts/supervisors/${mode.id}` : "/api/accounts/supervisors";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? { name, email, department, schoolId: schoolId || null }
        : { name, email, department, schoolId: schoolId || null, initialPassword };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        toast.error(result.error ?? "Could not save.");
        return;
      }
      toast.success(isEdit ? "Supervisor updated." : "Supervisor added.");
      handleOpenChange(false);
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={!!mode} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Supervisor" : "Add Supervisor"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-name">Name</Label>
            <Input id="sup-name" value={name} onChange={(e) => setName(e.target.value)} required />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-email">Institutional Email</Label>
            <Input
              id="sup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sup-dept">Department</Label>
            <Input id="sup-dept" value={department} onChange={(e) => setDepartment(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label>School Assigned</Label>
            <Select value={schoolId} onValueChange={(v) => setSchoolId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Not yet assigned" />
              </SelectTrigger>
              <SelectContent>
                {schoolsData?.schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isEdit && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="sup-password">Initial Password</Label>
              <Input
                id="sup-password"
                type="text"
                value={initialPassword}
                onChange={(e) => setInitialPassword(e.target.value)}
                required
                minLength={8}
              />
              {fieldErrors.initialPassword && (
                <p className="text-xs text-destructive">{fieldErrors.initialPassword[0]}</p>
              )}
            </div>
          )}

          <SheetFooter className="px-0">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Add Supervisor"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
