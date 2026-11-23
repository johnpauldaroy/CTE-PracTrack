"use client";

import useSWR from "swr";
import { Label } from "@/components/ui/label";
import { sectionLabel } from "@/lib/section-label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface SectionOption {
  id: string;
  name: string;
  course: string;
  yearLevel: string;
}

/**
 * Section dropdown for staff-created interns. A section carries the course and year level,
 * so picking one fills both (no free-typed courses that differ by a letter). Sections are
 * managed by the admin in Settings → Sections.
 */
export function SectionSelect({
  id,
  value,
  onChange,
  error,
  currentLabel,
}: {
  id: string;
  value: string;
  onChange: (sectionId: string) => void;
  error?: string;
  /** For editing: what the intern has now when it is not (or no longer) a listed section. */
  currentLabel?: string;
}) {
  const { data } = useSWR<{ sections: SectionOption[] }>("/api/public/sections", fetcher);
  const sections = data?.sections ?? [];
  const selected = sections.find((section) => section.id === value);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Course, Year &amp; Section</Label>
      <Select value={value} onValueChange={(next) => onChange(next ?? "")} items={Object.fromEntries(sections.map((s) => [s.id, sectionLabel(s)]))}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Select course, year & section..." />
        </SelectTrigger>
        <SelectContent>
          {sections.map((section) => (
            <SelectItem key={section.id} value={section.id}>
              {sectionLabel(section)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected ? (
        <p className="text-xs text-muted-foreground">
          Course: {selected.course} · Year level: {selected.yearLevel}
        </p>
      ) : currentLabel ? (
        <p className="text-xs text-muted-foreground">Currently: {currentLabel}. Pick a section to change it.</p>
      ) : null}
      {data && sections.length === 0 && (
        <p className="text-xs text-destructive">No sections yet. Add one in Settings → Sections first.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
