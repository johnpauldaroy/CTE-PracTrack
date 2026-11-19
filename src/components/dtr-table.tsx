import { cn } from "@/lib/utils";
import { ShowMoreButton, useShowMore } from "@/components/pagination";

export interface DtrRowData {
  id: string;
  date: string;
  day: string;
  amIn: string | null;
  amOut: string | null;
  pmIn: string | null;
  pmOut: string | null;
  status: string;
  excuseReason: string | null;
  noDutyReason: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  PRESENT: "text-success",
  ABSENT: "text-destructive",
  INCOMPLETE: "text-warning",
  LATE: "text-warning",
  EXCUSED: "text-muted-foreground",
  NO_DUTY: "text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = { NO_DUTY: "No class / duty" };

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase();
}

/** "7:25 AM – 12:01 PM", with an em dash for a punch that was not made. */
function Half({ timeIn, timeOut }: { timeIn: string | null; timeOut: string | null }) {
  if (!timeIn && !timeOut) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="whitespace-nowrap">
      {timeIn ?? "—"}
      <span className="mx-1 text-muted-foreground">–</span>
      {timeOut ?? "—"}
    </span>
  );
}

export function DtrTable({ rows }: { rows: DtrRowData[] }) {
  const more = useShowMore(rows, 14);
  return (
    <div className="flex flex-col gap-2">
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Day</th>
            <th className="px-3 py-2">AM In – Out</th>
            <th className="px-3 py-2">PM In – Out</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {more.rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0">
              <td className="px-3 py-2">{row.date}</td>
              <td className="px-3 py-2">{row.day}</td>
              <td className="px-3 py-2">
                <Half timeIn={row.amIn} timeOut={row.amOut} />
              </td>
              <td className="px-3 py-2">
                <Half timeIn={row.pmIn} timeOut={row.pmOut} />
              </td>
              <td className={cn("px-3 py-2 font-medium", STATUS_STYLES[row.status])}>
                {statusLabel(row.status)}
                {row.status === "EXCUSED" && row.excuseReason && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">({row.excuseReason})</span>
                )}
                {row.status === "NO_DUTY" && row.noDutyReason && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">({row.noDutyReason})</span>
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
    <ShowMoreButton hasMore={more.hasMore} remaining={more.remaining} onClick={more.showMore} />
    </div>
  );
}
