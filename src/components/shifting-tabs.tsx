"use client";

import { cn } from "@/lib/utils";

export interface ShiftingOption {
  id: string;
  name: "FIRST" | "SECOND";
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
}

export function ShiftingTabs({
  shiftings,
  selectedId,
  onSelect,
}: {
  shiftings: ShiftingOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (shiftings.length === 0) return null;

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {shiftings.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            selectedId === s.id ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
          )}
        >
          {s.name === "FIRST" ? "First Shifting" : "Second Shifting"}
        </button>
      ))}
    </div>
  );
}
