import { Badge } from "@/components/ui/badge";

export type ProgressReportState = "SUBMITTED" | "UPCOMING" | "DUE" | "OVERDUE";

const LABEL: Record<ProgressReportState, string> = {
  SUBMITTED: "Submitted",
  UPCOMING: "Upcoming",
  DUE: "Due",
  OVERDUE: "Overdue",
};

export function ProgressReportStateBadge({ state }: { state: ProgressReportState }) {
  return (
    <Badge
      variant={state === "SUBMITTED" ? "default" : state === "OVERDUE" ? "outline" : "secondary"}
      className={state === "OVERDUE" ? "border-destructive text-destructive" : undefined}
    >
      {LABEL[state]}
    </Badge>
  );
}
