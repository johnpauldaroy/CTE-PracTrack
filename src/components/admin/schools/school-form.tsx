"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationField, type LocationValue } from "@/components/maps/location-field";
import { cn } from "@/lib/utils";

export type SchoolType = "SECONDARY" | "ELEMENTARY";

export interface SchoolFormValues {
  name: string;
  type: SchoolType;
  municipality: string;
  latitude: string;
  longitude: string;
  radius: number;
}

export const EMPTY_SCHOOL_FORM: SchoolFormValues = {
  name: "",
  type: "SECONDARY",
  municipality: "",
  latitude: "",
  longitude: "",
  radius: 75,
};

/** Converts form strings to the API payload shape (createSchoolSchema / updateSchoolSchema). */
export function toSchoolPayload(values: SchoolFormValues) {
  return {
    name: values.name,
    type: values.type,
    municipality: values.municipality,
    latitude: Number(values.latitude),
    longitude: Number(values.longitude),
    geofenceRadiusMeters: values.radius,
  };
}

/** Fields shared by Add School and Edit School so the two can't drift apart. */
export function SchoolForm({
  initialValues,
  submitLabel,
  submittingLabel,
  onSubmit,
  footerNote,
}: {
  initialValues: SchoolFormValues;
  submitLabel: string;
  submittingLabel: string;
  /** Resolves to per-field errors on a validation failure, or nothing on success. */
  onSubmit: (values: SchoolFormValues) => Promise<Record<string, string[]> | void>;
  footerNote?: React.ReactNode;
}) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof SchoolFormValues>(key: K, value: SchoolFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const errors = await onSubmit(values);
      if (errors) setFieldErrors(errors);
    } finally {
      setIsSubmitting(false);
    }
  }

  const location: LocationValue = { latitude: values.latitude, longitude: values.longitude, radius: values.radius };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="school-name">School Name</Label>
        <Input
          id="school-name"
          required
          placeholder="e.g. San Antonio National High School"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
        />
        {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Type</Label>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(["SECONDARY", "ELEMENTARY"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("type", t)}
              aria-pressed={values.type === t}
              className={cn(
                "rounded-md py-2 text-sm font-medium capitalize transition-colors",
                values.type === t ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
              )}
            >
              {t.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="school-municipality">Municipality</Label>
        <Input
          id="school-municipality"
          required
          placeholder="e.g. Hamtic"
          value={values.municipality}
          onChange={(e) => set("municipality", e.target.value)}
        />
        {fieldErrors.municipality && <p className="text-xs text-destructive">{fieldErrors.municipality[0]}</p>}
      </div>

      <LocationField
        value={location}
        onChange={(next) => setValues((current) => ({ ...current, ...next }))}
        fieldErrors={fieldErrors}
      />

      {footerNote}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
