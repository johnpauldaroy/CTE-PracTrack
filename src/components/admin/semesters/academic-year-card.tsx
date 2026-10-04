"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Archive, Check, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AcademicYearData, ShiftingData } from "@/components/admin/semesters/semesters-page";

const STATUS_STYLES: Record<ShiftingData["status"], string> = {
  ACTIVE: "bg-success/15 text-success",
  COMPLETED: "bg-muted text-muted-foreground",
  UPCOMING: "bg-accent text-accent-foreground",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function AcademicYearCard({
  year,
  onConfigureShifting,
  onActivated,
  onArchived,
}: {
  year: AcademicYearData;
  onConfigureShifting: (shiftingId: string) => void;
  onActivated: () => void;
  onArchived: () => void;
}) {
  const [isArchiving, setIsArchiving] = useState(false);
  const shiftings = year.semesters.flatMap((semester) => semester.shiftings);
  const canArchive = shiftings.length > 0 && shiftings.every((shifting) => shifting.status === "COMPLETED");

  async function handleArchive() {
    if (!confirm(`Archive Academic Year ${year.label}? It moves to Archived Academic Years (read-only). No records are changed.`)) return;
    setIsArchiving(true);
    try {
      const res = await fetch(`/api/academic-years/${year.id}/archive`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not archive the academic year.");
        return;
      }
      toast.success(`Academic Year ${year.label} archived.`);
      onArchived();
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canArchive && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/50 px-4 py-3 text-sm">
          <span>Every shifting in Academic Year {year.label} is completed.</span>
          <Button variant="outline" size="sm" onClick={handleArchive} disabled={isArchiving}>
            <Archive /> {isArchiving ? "Archiving…" : "Archive academic year"}
          </Button>
        </div>
      )}
      {year.semesters.map((semester) => {
        const activeShifting = semester.shiftings.find((s) => s.status === "ACTIVE");
        return (
          <Card key={semester.id}>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {semester.name} · {formatDate(semester.startDate)} – {formatDate(semester.endDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">Academic Year {year.label}</p>
                </div>
                {activeShifting && <Badge className="bg-success/15 text-success">Active</Badge>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {semester.shiftings.map((shifting) => (
                  <ShiftingCard
                    key={shifting.id}
                    shifting={shifting}
                    onConfigure={() => onConfigureShifting(shifting.id)}
                    onActivated={onActivated}
                  />
                ))}
              </div>

              {semester.shiftings.some((s) => s.status !== "COMPLETED") && (
                <div className="rounded-lg border border-warning/40 bg-accent px-4 py-3 text-sm text-accent-foreground">
                  Setting a Shifting Period to Active marks the current one as Completed and resets
                  session counts for all interns. Historical data is always preserved.
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ShiftingCard({
  shifting,
  onConfigure,
  onActivated,
}: {
  shifting: ShiftingData;
  onConfigure: () => void;
  onActivated: () => void;
}) {
  const [isActivating, setIsActivating] = useState(false);

  async function handleActivate() {
    if (!confirm("Activate this shifting? The current active shifting will be marked Completed.")) return;
    setIsActivating(true);
    try {
      const res = await fetch(`/api/shiftings/${shifting.id}/activate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not activate shifting.");
        return;
      }
      toast.success("Shifting activated.");
      onActivated();
    } finally {
      setIsActivating(false);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">{shifting.name === "FIRST" ? "First Shifting" : "Second Shifting"}</p>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[shifting.status])}>
          {shifting.status === "ACTIVE" ? "Active" : shifting.status === "COMPLETED" ? "Completed" : "Upcoming"}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {formatDate(shifting.startDate)} – {formatDate(shifting.endDate)}
      </p>
      <p className="text-sm text-muted-foreground">
        {shifting.requiredTeachingSessions} sessions required · {shifting.requiredFinalDemos} Final Demo
      </p>

      <div className="mt-3 flex gap-2">
        {shifting.status === "COMPLETED" ? (
          <Button variant="outline" size="sm" render={<Link href={`/semesters/shiftings/${shifting.id}`} />}>
            <Archive /> View Archive
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={onConfigure}>
              <Pencil /> Edit
            </Button>
            {shifting.status === "UPCOMING" && (
              <Button size="sm" onClick={handleActivate} disabled={isActivating}>
                <Check /> {isActivating ? "Activating…" : "Activate"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
