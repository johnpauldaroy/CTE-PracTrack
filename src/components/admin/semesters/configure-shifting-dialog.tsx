"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ShiftingData } from "@/components/admin/semesters/semesters-page";

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [requiredTeachingSessions, setRequiredTeachingSessions] = useState(15);
  const [requiredFinalDemos, setRequiredFinalDemos] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (shifting) {
      setStartDate(toDateInputValue(shifting.startDate));
      setEndDate(toDateInputValue(shifting.endDate));
      setRequiredTeachingSessions(shifting.requiredTeachingSessions);
      setRequiredFinalDemos(shifting.requiredFinalDemos);
    }
  }, [shifting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shifting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/shiftings/${shifting.id}/configure`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, requiredTeachingSessions, requiredFinalDemos }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save shifting.");
        return;
      }
      toast.success("Shifting updated.");
      onOpenChange(false);
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={!!shifting} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure Shifting</DialogTitle>
        </DialogHeader>

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

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
