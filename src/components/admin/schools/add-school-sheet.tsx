"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EMPTY_SCHOOL_FORM, SchoolForm, toSchoolPayload, type SchoolFormValues } from "@/components/admin/schools/school-form";

interface AddSchoolSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function AddSchoolSheet({ open, onOpenChange, onCreated }: AddSchoolSheetProps) {
  // Remount the form after each successful add so it starts empty.
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(values: SchoolFormValues) {
    const res = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toSchoolPayload(values)),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not add school.");
      return data.fieldErrors;
    }
    toast.success(`${values.name} added.`);
    setFormKey((key) => key + 1);
    onOpenChange(false);
    onCreated();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add School</SheetTitle>
        </SheetHeader>
        <SchoolForm
          key={formKey}
          initialValues={EMPTY_SCHOOL_FORM}
          submitLabel="Add School"
          submittingLabel="Adding…"
          onSubmit={handleSubmit}
        />
      </SheetContent>
    </Sheet>
  );
}
