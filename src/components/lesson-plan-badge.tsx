"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatManila } from "@/lib/timezone";

export type LessonPlanStatus = "NOT_SUBMITTED" | "SUBMITTED" | "APPROVED" | "RETURNED";

const LABELS: Record<LessonPlanStatus, string> = {
  NOT_SUBMITTED: "Lesson plan: Not submitted",
  SUBMITTED: "Lesson plan: Submitted",
  APPROVED: "Lesson plan: Approved. Ready for demo",
  RETURNED: "Lesson plan: Returned for revision",
};

/** The one lesson-plan indicator (replaces the old `Documents: n/2` count). */
export function LessonPlanBadge({ status, dueDate }: { status: LessonPlanStatus; dueDate?: string | null }) {
  const [now] = useState(() => Date.now());
  const overdue =
    !!dueDate && (status === "NOT_SUBMITTED" || status === "RETURNED") && new Date(dueDate).getTime() < now - 86_400_000;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge
        variant={status === "APPROVED" ? "default" : status === "SUBMITTED" ? "secondary" : "outline"}
        className={status === "RETURNED" || overdue ? "border-destructive text-destructive" : undefined}
      >
        {LABELS[status]}
      </Badge>
      {dueDate && status !== "APPROVED" && (
        <span className={overdue ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
          {overdue ? "Overdue · " : "Due "}
          {formatManila(new Date(dueDate), "MMM d, yyyy")}
        </span>
      )}
    </span>
  );
}
