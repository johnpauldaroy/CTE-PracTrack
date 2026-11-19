"use client";

import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const CHECK_IN_FIELD_KEYS = [
  "amTimeInCutoff",
  "amTimeOutStart",
  "pmTimeInCutoff",
  "pmTimeOutStart",
  "pmWindowOpensAt",
] as const;
export type CheckInFieldKey = (typeof CHECK_IN_FIELD_KEYS)[number];
export type CheckInValues = Record<CheckInFieldKey, string>;

const GROUPS: { title: string; fields: { key: CheckInFieldKey; label: string; help?: string }[] }[] = [
  {
    title: "Morning (AM)",
    fields: [
      { key: "amTimeInCutoff", label: "Time In cut-off", help: "Time In after this is Late." },
      { key: "amTimeOutStart", label: "Time Out start", help: "Earliest morning Time Out." },
    ],
  },
  {
    title: "Afternoon (PM)",
    fields: [
      { key: "pmTimeInCutoff", label: "Time In cut-off", help: "Time In after this is Late." },
      { key: "pmTimeOutStart", label: "Time Out start", help: "Earliest afternoon Time Out." },
    ],
  },
  {
    title: "Day split",
    fields: [
      {
        key: "pmWindowOpensAt",
        label: "Afternoon begins at",
        help: "A Time In at or after this time counts as the afternoon Time In.",
      },
    ],
  },
];

/**
 * The five check-in times, grouped Morning / Afternoon. With `optional`, a blank
 * field means "use the global default" (school overrides); otherwise every field
 * is required (the global settings).
 */
export function CheckInFields({
  idPrefix,
  values,
  onChange,
  optional = false,
  placeholders,
}: {
  idPrefix: string;
  values: Record<CheckInFieldKey, string>;
  onChange: (key: CheckInFieldKey, value: string) => void;
  optional?: boolean;
  /** Shown as the hint under a blank override field (the global value). */
  placeholders?: Partial<Record<CheckInFieldKey, string>>;
}) {
  return (
    <div className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <fieldset key={group.title} className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-semibold">{group.title}</legend>
          {group.fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`${idPrefix}-${field.key}`} className="flex items-center gap-1.5">
                <Clock className="size-3.5" /> {field.label}
                {optional && <span className="font-normal text-muted-foreground">(blank = global default)</span>}
              </Label>
              <Input
                id={`${idPrefix}-${field.key}`}
                type="time"
                required={!optional}
                value={values[field.key]}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {field.help}
                {optional && !values[field.key] && placeholders?.[field.key] ? ` Global default: ${placeholders[field.key]}.` : ""}
              </p>
            </div>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
