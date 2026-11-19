"use client";

import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ProgressPeriodsEditor } from "@/components/admin/semesters/progress-periods-editor";
import type { ShiftingData } from "@/components/admin/semesters/semesters-page";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

export function ConfigureShiftingDialog({
  shifting,
  onOpenChange,
  onSaved,
}: {
  shifting: ShiftingData | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={!!shifting} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Shifting</DialogTitle>
        </DialogHeader>

        {shifting && (
          <ConfigureShiftingForm
            key={shifting.id}
            shifting={shifting}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfigureShiftingForm({
  shifting,
  onCancel,
  onSaved,
}: {
  shifting: ShiftingData;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [startDate, setStartDate] = useState(toDateInputValue(shifting.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(shifting.endDate));
  const [requiredTeachingSessions, setRequiredTeachingSessions] = useState(shifting.requiredTeachingSessions);
  const [requiredFinalDemos, setRequiredFinalDemos] = useState(shifting.requiredFinalDemos);
  const [dutyWeekdays, setDutyWeekdays] = useState<number[]>(shifting.dutyWeekdays ?? [1, 2, 3, 4, 5]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleDay(day: number) {
    setDutyWeekdays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/shiftings/${shifting.id}/configure`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, requiredTeachingSessions, requiredFinalDemos, dutyWeekdays }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save shifting.");
        return;
      }
      toast.success("Shifting updated.");
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cs-start">Start Date</Label>
              <Input id="cs-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cs-end">End Date</Label>
              <Input id="cs-end" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cs-sessions">Required Teaching Sessions</Label>
              <Input
                id="cs-sessions"
                type="number"
                min={1}
                required
                value={requiredTeachingSessions}
                onChange={(e) => setRequiredTeachingSessions(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cs-demos">Required Final Demos</Label>
              <Input
                id="cs-demos"
                type="number"
                min={0}
                required
                value={requiredFinalDemos}
                onChange={(e) => setRequiredFinalDemos(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Duty days</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((label, day) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={dutyWeekdays.includes(day)}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    dutyWeekdays.includes(day) ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Interns are expected on these days only. Other days are never counted as absences. Holidays and class
              suspensions are marked per date from the intern&apos;s DTR.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel}>
              <X /> Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
    </form>
    <div className="border-t pt-4">
      <ProgressPeriodsEditor shiftingId={shifting.id} />
    </div>
    </>
  );
}
