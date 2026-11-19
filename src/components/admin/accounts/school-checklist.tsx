"use client";

import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SchoolOption {
  id: string;
  name: string;
  supervisorProfile: { user: { id: string; name: string } } | null;
}

/**
 * Pick the schools a supervisor covers. A school has at most one supervisor, so a
 * school that already belongs to someone else is shown but cannot be ticked; unassign
 * it from them first.
 */
export function SchoolChecklist({
  selected,
  onChange,
  supervisorUserId,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  /** The supervisor being edited (their own schools stay selectable). Omit when adding. */
  supervisorUserId?: string;
}) {
  const { data } = useSWR<{ schools: SchoolOption[] }>("/api/schools", fetcher);
  if (!data) return <Skeleton className="h-24 w-full" />;

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border p-2">
      {data.schools.map((school) => {
        const owner = school.supervisorProfile?.user;
        const takenByOther = !!owner && owner.id !== supervisorUserId;
        return (
          <label
            key={school.id}
            className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm ${takenByOther ? "opacity-60" : "cursor-pointer hover:bg-muted"}`}
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={selected.includes(school.id)}
              disabled={takenByOther}
              onChange={() => toggle(school.id)}
            />
            <span>
              {school.name}
              {takenByOther && <span className="block text-xs text-muted-foreground">Supervisor: {owner.name}</span>}
            </span>
          </label>
        );
      })}
      {data.schools.length === 0 && <p className="p-2 text-sm text-muted-foreground">No schools yet.</p>}
    </div>
  );
}
