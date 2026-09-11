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

interface InternDetail {
  id: string;
  schoolNumber: string;
  course: string;
  user: { name: string; email: string };
  assignedSchool: { id: string; name: string };
}

interface SchoolOption {
  id: string;
  name: string;
}

export function EditInternSheet({
  internId,
  onOpenChange,
  onSaved,
}: {
  internId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [schoolNumber, setSchoolNumber] = useState("");
  const [course, setCourse] = useState("");
  const [email, setEmail] = useState("");
  const [assignedSchoolId, setAssignedSchoolId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  useSWR<{ intern: InternDetail }>(
    internId ? `/api/accounts/interns/${internId}` : null,
    fetcher,
    {
      onSuccess: ({ intern }) => {
        setName(intern.user.name);
        setSchoolNumber(intern.schoolNumber);
        setCourse(intern.course);
        setEmail(intern.user.email);
        setAssignedSchoolId(intern.assignedSchool.id);
      },
      revalidateOnFocus: false,
    },
  );
  const { data: schoolsData } = useSWR<{ schools: SchoolOption[] }>("/api/schools", fetcher);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!internId) return;
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/interns/${internId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, schoolNumber, course, email, assignedSchoolId }),
      });
      const result = await res.json();
      if (!res.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        toast.error(result.error ?? "Could not save changes.");
        return;
      }
      toast.success("Account updated.");
      onOpenChange(false);
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={!!internId} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Account</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 pb-4">
          <p className="text-sm text-muted-foreground">
            Edit only for corrections (e.g., wrong school selected, typo in name).
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-intern-name">Name</Label>
            <Input id="edit-intern-name" value={name} onChange={(e) => setName(e.target.value)} required />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-intern-schoolnum">School ID</Label>
            <Input
              id="edit-intern-schoolnum"
              value={schoolNumber}
              onChange={(e) => setSchoolNumber(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-intern-course">Course</Label>
            <Input id="edit-intern-course" value={course} onChange={(e) => setCourse(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-intern-email">Email</Label>
            <Input
              id="edit-intern-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>School</Label>
            <Select value={assignedSchoolId} onValueChange={(v) => setAssignedSchoolId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select school" />
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

          <SheetFooter className="px-0">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
