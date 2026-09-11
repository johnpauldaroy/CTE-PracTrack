"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddSemesterForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [academicYearLabel, setAcademicYearLabel] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYearLabel, name, startDate, endDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        toast.error(data.error ?? "Could not create semester.");
        return;
      }
      toast.success(`${name} created with First and Second Shifting.`);
      onCreated();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-lg font-semibold">New Semester</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each semester is created with two fixed shiftings: First Shifting and Second Shifting.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ay-label">Academic Year</Label>
            <Input
              id="ay-label"
              required
              placeholder="e.g. 2026-2027"
              value={academicYearLabel}
              onChange={(e) => setAcademicYearLabel(e.target.value)}
            />
            {fieldErrors.academicYearLabel && (
              <p className="text-xs text-destructive">{fieldErrors.academicYearLabel[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sem-name">Semester Name</Label>
            <Input
              id="sem-name"
              required
              placeholder="e.g. Second Semester"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sem-start">Overall Start Date</Label>
              <Input
                id="sem-start"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sem-end">Overall End Date</Label>
              <Input id="sem-end" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create"}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
