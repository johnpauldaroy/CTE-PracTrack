import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/session";
import { listAuditLogs } from "@/lib/services/audit-service";
import { auditLogFiltersSchema } from "@/lib/validation/audit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_LABELS = {
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
  COOPERATING_TEACHER: "Cooperating Teacher",
  STUDENT_INTERN: "Student Intern",
} as const;

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireRole("ADMIN");
  const parsed = auditLogFiltersSchema.safeParse(await searchParams);
  const filters = parsed.success ? parsed.data : {};
  const { logs, total, page, pageCount, actions } = await listAuditLogs(actor, filters);
  const hasFilters = Boolean(filters.action || filters.role || filters.from || filters.to || filters.q);

  function pageHref(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value && key !== "page") params.set(key, String(value));
    params.set("page", String(target));
    return `/audit-log?${params}`;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Every action a stakeholder could later dispute, newest first. Times are in Philippine time.
        </p>
      </div>

      <form method="get" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <Label htmlFor="audit-q">Search</Label>
          <Input id="audit-q" name="q" placeholder="Name, action, or record id" defaultValue={filters.q ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-action">Action</Label>
          <select id="audit-action" name="action" defaultValue={filters.action ?? ""} className={selectClass}>
            <option value="">All actions</option>
            {actions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-role">Role</Label>
          <select id="audit-role" name="role" defaultValue={filters.role ?? ""} className={selectClass}>
            <option value="">All roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-from">From</Label>
          <Input id="audit-from" name="from" type="date" defaultValue={filters.from ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-to">To</Label>
          <Input id="audit-to" name="to" type="date" defaultValue={filters.to ?? ""} />
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6 lg:justify-end">
          {hasFilters && (
            <Button variant="ghost" size="sm" render={<Link href="/audit-log" />}>
              Clear filters
            </Button>
          )}
          <Button type="submit" size="sm">
            Apply filters
          </Button>
        </div>
      </form>

      {!parsed.success && <p className="text-sm text-destructive">Some filters were invalid and were ignored.</p>}

      <p className="text-sm text-muted-foreground">
        {total === 0 ? "No matching entries." : `${total} entr${total === 1 ? "y" : "ies"}${hasFilters ? " match these filters" : ""}.`}
      </p>

      <ol className="flex flex-col gap-3">
        {logs.map((log) => (
          <li key={log.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <time>{log.when}</time>
              <span aria-hidden>·</span>
              <Badge variant="secondary">{log.actionLabel}</Badge>
              <Badge variant="outline">{ROLE_LABELS[log.actorRole]}</Badge>
            </div>
            <p className="mt-2 text-sm font-medium">{log.summary}</p>

            {log.changes.length > 0 && (
              <dl className="mt-3 grid gap-1.5 rounded-lg bg-muted/60 p-3 text-sm sm:grid-cols-[minmax(10rem,auto)_1fr] sm:gap-x-4">
                {log.changes.map((change) => (
                  <div key={change.label} className="contents">
                    <dt className="text-muted-foreground">{change.label}</dt>
                    <dd className="flex flex-wrap items-center gap-1.5 break-words">
                      {change.before !== undefined && (
                        <>
                          <span className="text-muted-foreground line-through decoration-muted-foreground/50">{change.before}</span>
                          <ArrowRight className="size-3.5 text-muted-foreground" aria-label="changed to" />
                        </>
                      )}
                      <span>{change.after}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none">Record details</summary>
              <p className="mt-2">
                {log.entityType} · <span className="font-mono">{log.entityId}</span>
              </p>
              {log.rawDiff && <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 font-mono whitespace-pre-wrap">{log.rawDiff}</pre>}
            </details>
          </li>
        ))}
      </ol>

      {pageCount > 1 && (
        <nav className="flex items-center justify-between" aria-label="Audit log pages">
          <Button variant="outline" size="sm" disabled={page <= 1} render={page > 1 ? <Link href={pageHref(page - 1)} /> : undefined}>
            <ChevronLeft /> Newer
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            render={page < pageCount ? <Link href={pageHref(page + 1)} /> : undefined}
          >
            Older <ChevronRight />
          </Button>
        </nav>
      )}
    </div>
  );
}
