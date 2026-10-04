"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Confirms a school soft delete by having the admin type the school's name.
 * The server re-checks every blocker; `internCount` only lets the dialog
 * explain up front why the delete won't go through.
 */
export function DeleteSchoolDialog({
  school,
  internCount,
  open,
  onOpenChange,
  onDeleted,
}: {
  school: { id: string; name: string };
  internCount?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const matches = confirmation.trim().toLowerCase() === school.name.trim().toLowerCase();
  const blocked = (internCount ?? 0) > 0;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setConfirmation("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/schools/${school.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not delete the school.");
        return;
      }
      toast.success(`${school.name} deleted. You can restore it from Recently deleted on the Schools page.`);
      handleOpenChange(false);
      onDeleted();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {school.name}?</DialogTitle>
          <DialogDescription>
            The school will be hidden from every list and picker, and its supervisor will be unassigned. Its history
            (attendance, alerts, audit entries) is kept, and you can restore it later from Recently deleted.
          </DialogDescription>
        </DialogHeader>

        {blocked ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {internCount} intern(s) are still assigned to this school. Reassign or remove them before deleting it.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-school-confirm">
              Type <span className="font-semibold">{school.name}</span> to confirm
            </Label>
            <Input
              id="delete-school-confirm"
              autoComplete="off"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches && !isDeleting) handleDelete();
              }}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={blocked || !matches || isDeleting}>
            {isDeleting ? "Deleting…" : "Delete school"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
