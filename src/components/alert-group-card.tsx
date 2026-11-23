import { Badge } from "@/components/ui/badge";
import type { AlertGroup, GroupableAlert } from "@/lib/alert-groups";

/** One card per intern: the highest severity in the badge, every triggered rule listed beneath. */
export function AlertGroupCard<T extends GroupableAlert>({ group, children }: { group: AlertGroup<T>; children?: React.ReactNode }) {
  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex justify-between gap-2">
        <p className="font-semibold">{group.internName}</p>
        <Badge variant={group.severity === "HIGH" ? "destructive" : "secondary"}>{group.severity}</Badge>
      </div>
      {group.schoolName && <p className="text-sm text-muted-foreground">{group.schoolName}</p>}
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {group.alerts.map((alert) => (
          <li key={alert.id} className="flex gap-2">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
            <span>{alert.detail}</span>
          </li>
        ))}
      </ul>
      {children}
    </article>
  );
}
