import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listResolutions } from "@/lib/services/alert-query-service";
import { formatManila } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** What supervisors did about flagged students: the notes they wrote when resolving alerts. */
export default async function ResolutionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const actor = await requireRole("ADMIN");
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const schoolId = params.schoolId || undefined;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const [{ entries, total, page, pageCount }, schools] = await Promise.all([
    listResolutions(actor, { q, schoolId, page: Number.isFinite(requestedPage) ? requestedPage : 1 }),
    prisma.school.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const hasFilters = Boolean(q || schoolId);

  function pageHref(target: number) {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (schoolId) next.set("schoolId", schoolId);
    next.set("page", String(target));
    return `/resolutions?${next}`;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Resolutions</h1>
        <p className="text-sm text-muted-foreground">
          Alerts that supervisors have resolved, with the note they wrote about what was done. Newest first.
        </p>
      </div>

      <form method="get" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3 sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="res-q">Search</Label>
          <Input id="res-q" name="q" placeholder="Student, supervisor or note" defaultValue={q ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="res-school">School</Label>
          <select id="res-school" name="schoolId" defaultValue={schoolId ?? ""} className={selectClass}>
            <option value="">All schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 sm:justify-end">
          {hasFilters && (
            <Button variant="ghost" size="sm" render={<Link href="/resolutions" />}>
              Clear
            </Button>
          )}
          <Button type="submit" size="sm">
            Apply filters
          </Button>
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        {total === 0 ? "No resolutions yet." : `${total} resolution${total === 1 ? "" : "s"}${hasFilters ? " match these filters" : ""}.`}
      </p>

      <ol className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li key={entry.key} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="font-semibold">{entry.internName}</p>
              <time className="text-xs text-muted-foreground">
                {entry.resolvedAt ? formatManila(entry.resolvedAt, "MMM d, yyyy h:mm a") : ""}
              </time>
            </div>
            <p className="text-sm text-muted-foreground">{entry.schoolName}</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {entry.flags.map((flag) => (
                <li key={flag.id} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                  <span>{flag.detail}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Resolved by {entry.resolvedBy ?? "—"}</p>
              <p className="mt-1 whitespace-pre-wrap">{entry.note ?? "No note recorded."}</p>
            </div>
          </li>
        ))}
      </ol>

      {pageCount > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <Button variant="outline" size="sm" disabled={page <= 1} render={<Link href={pageHref(page - 1)} />}>
            <ChevronLeft /> Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} render={<Link href={pageHref(page + 1)} />}>
            Next <ChevronRight />
          </Button>
        </nav>
      )}
    </div>
  );
}
