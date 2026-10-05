"use client";

import { toast } from "sonner";
import { Info } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SchoolForm, toSchoolPayload, type SchoolFormValues } from "@/components/admin/schools/school-form";
import type { SchoolDetailData } from "@/components/admin/schools/school-detail";

export function EditSchoolSheet({
  school,
  open,
  onOpenChange,
  onSaved,
}: {
  school: SchoolDetailData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  async function handleSubmit(values: SchoolFormValues) {
    const res = await fetch(`/api/schools/${school.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toSchoolPayload(values)),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not save school.");
      return data.fieldErrors;
    }
    toast.success("School updated.");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit School</SheetTitle>
          <SheetDescription>Correct the school&apos;s details or move its pin if it was placed in the wrong spot.</SheetDescription>
        </SheetHeader>
        {open && (
          <SchoolForm
            initialValues={{
              name: school.name,
              type: school.type,
              municipality: school.municipality,
              latitude: String(Number(school.latitude)),
              longitude: String(Number(school.longitude)),
              radius: school.geofenceRadiusMeters,
            }}
            submitLabel="Save Changes"
            submittingLabel="Saving…"
            onSubmit={handleSubmit}
            footerNote={
              <p className="flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                A new location or geofence applies to future time-ins only. Past attendance keeps the distance recorded at
                the time.
              </p>
            }
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
