"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShowMoreButton, useShowMore } from "@/components/pagination";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Teacher {
  id: string;
  user: { name: string; email: string; phone: string | null };
  school: { id: string; name: string };
  assignedIntern: { id: string; user: { name: string } } | null;
}
interface FreeIntern {
  id: string;
  assignedSchoolId: string;
  course: string;
  yearLevel: string;
  user: { name: string };
  section: { name: string } | null;
}

const BOARD_URL = "/api/supervisor/cooperating-teachers";

/** The supervisor pairs each cooperating teacher of their school(s) with exactly one intern (and the reverse). */
export default function SupervisorTeachersPage() {
  const { data, isLoading, mutate } = useSWR<{ cts: Teacher[]; unpairedInterns: FreeIntern[] }>(BOARD_URL, fetcher);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const teachers = data?.cts ?? [];
  const more = useShowMore(teachers, 10);

  async function pair(ctId: string, internId: string | null, targetInternId: string) {
    setBusy(ctId);
    try {
      const response = await fetch(`/api/interns/${targetInternId}/cooperating-teacher`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cooperatingTeacherId: internId ? ctId : null }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.fieldErrors?.cooperatingTeacherId?.[0] ?? result.error ?? "Could not update the pairing.");
      } else {
        toast.success(internId ? "Teacher paired with intern." : "Pairing removed.");
        setChoice((current) => ({ ...current, [ctId]: "" }));
      }
      mutate();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="font-heading text-xl font-bold">Cooperating Teachers</h1>
        <p className="text-sm text-muted-foreground">
          Teachers of your partner school(s). Pair each teacher with one intern; a teacher handles only the intern paired with them.
        </p>
      </div>

      {isLoading && <Skeleton className="h-32 w-full" />}
      {data && !teachers.length && (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          No approved cooperating teachers at your school(s) yet. They appear here once the CTE office approves their registration.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {more.rows.map((teacher) => {
          const free = (data?.unpairedInterns ?? []).filter((intern) => intern.assignedSchoolId === teacher.school.id);
          return (
            <article key={teacher.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{teacher.user.name}</p>
                  <p className="text-xs text-muted-foreground">{teacher.school.name}</p>
                  <p className="text-xs text-muted-foreground">{teacher.user.email}</p>
                </div>
                <span
                  className={
                    teacher.assignedIntern
                      ? "rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                      : "rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
                  }
                >
                  {teacher.assignedIntern ? "Paired" : "Available"}
                </span>
              </div>

              {teacher.assignedIntern ? (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-sm">
                    Intern: <span className="font-medium">{teacher.assignedIntern.user.name}</span>
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === teacher.id}
                    onClick={() => pair(teacher.id, null, teacher.assignedIntern!.id)}
                  >
                    Unpair
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <select
                    aria-label={`Intern for ${teacher.user.name}`}
                    className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm"
                    value={choice[teacher.id] ?? ""}
                    onChange={(event) => setChoice((current) => ({ ...current, [teacher.id]: event.target.value }))}
                  >
                    <option value="">{free.length ? "Choose an intern…" : "No unpaired interns"}</option>
                    {free.map((intern) => (
                      <option key={intern.id} value={intern.id}>
                        {intern.user.name}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" disabled={!choice[teacher.id] || busy === teacher.id} onClick={() => pair(teacher.id, choice[teacher.id], choice[teacher.id])}>
                    Pair
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <ShowMoreButton hasMore={more.hasMore} remaining={more.remaining} onClick={more.showMore} />
    </div>
  );
}
