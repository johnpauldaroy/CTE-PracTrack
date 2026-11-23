"use client";
import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import { ShowMoreButton, useShowMore } from "@/components/pagination";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CtIntern {
  id: string;
  schoolNumber: string | null;
  course: string;
  yearLevel: string;
  user: { name: string; email: string };
}

export default function CtInternsPage() {
  const { data, isLoading } = useSWR<{ interns: CtIntern[] }>("/api/ct/interns", fetcher);
  const more = useShowMore(data?.interns ?? [], 15);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="font-heading text-xl font-bold">My Intern</h1>
      {isLoading ? (
        <Skeleton className="h-32" />
      ) : (
        <>
          {more.rows.map((intern) => (
            <article key={intern.id} className="rounded-xl border bg-card p-4">
              <p className="font-semibold">{intern.user.name}</p>
              <p className="text-sm text-muted-foreground">
                {intern.schoolNumber ? `${intern.schoolNumber} · ` : ""}
                {intern.course} · {intern.yearLevel}
              </p>
              <p className="text-xs text-muted-foreground">{intern.user.email}</p>
            </article>
          ))}
          {!more.total && <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">You are not paired with an intern yet. Your school&apos;s supervisor pairs each cooperating teacher with one intern; you will be notified.</p>}
          <ShowMoreButton hasMore={more.hasMore} remaining={more.remaining} onClick={more.showMore} />
        </>
      )}
    </div>
  );
}
