import { cn } from "@/lib/utils";

export interface DtrRowData {
  id: string;
  date: string;
  day: string;
  timeIn: string | null;
  timeOut: string | null;
  status: string;
  excuseReason: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "text-success",
  ABSENT: "text-destructive",
  INCOMPLETE: "text-warning",
  LATE: "text-warning",
  EXCUSED: "text-muted-foreground",
};

export function DtrTable({ rows }: { rows: DtrRowData[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Day</th>
            <th className="px-3 py-2">Time In</th>
            <th className="px-3 py-2">Time Out</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="px-3 py-2">{row.date}</td>
              <td className="px-3 py-2">{row.day}</td>
              <td className="px-3 py-2">{row.timeIn ?? "—"}</td>
              <td className="px-3 py-2">{row.timeOut ?? "—"}</td>
              <td className={cn("px-3 py-2 font-medium", STATUS_STYLES[row.status])}>
                {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                {row.status === "EXCUSED" && row.excuseReason && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">({row.excuseReason})</span>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                No attendance records yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
