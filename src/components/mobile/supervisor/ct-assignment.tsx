"use client";
import useSWR from "swr";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CtOption {
  id: string;
  user: { name: string };
  assignedIntern: { id: string; user: { name: string } } | null;
}

/** Picks the intern's cooperating teacher. Teachers who already have an intern are shown but cannot be chosen (1:1). */
export function CtAssignment({ internId }: { internId: string }) {
  const url = `/api/interns/${internId}/cooperating-teacher`;
  const { data, mutate } = useSWR<{ currentId: string | null; cts: CtOption[] }>(url, fetcher);

  async function update(value: string) {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cooperatingTeacherId: value || null }),
    });
    const result = await response.json();
    if (!response.ok) toast.error(result.fieldErrors?.cooperatingTeacherId?.[0] ?? result.error);
    else toast.success(value ? "Cooperating teacher paired." : "Cooperating teacher unpaired.");
    mutate();
  }

  return (
    <div className="rounded-xl border bg-card p-3">
      <label htmlFor="ct-pick" className="text-sm font-medium">Cooperating Teacher</label>
      <select
        id="ct-pick"
        className="mt-2 h-9 w-full rounded-lg border bg-background px-2 text-sm"
        value={data?.currentId ?? ""}
        onChange={(event) => update(event.target.value)}
      >
        <option value="">Not paired</option>
        {data?.cts.map((ct) => {
          const takenBy = ct.assignedIntern && ct.assignedIntern.id !== internId ? ct.assignedIntern.user.name : null;
          return (
            <option key={ct.id} value={ct.id} disabled={!!takenBy}>
              {ct.user.name}
              {takenBy ? ` — paired with ${takenBy}` : ""}
            </option>
          );
        })}
      </select>
      <p className="mt-2 text-xs text-muted-foreground">One teacher is paired with one intern. Manage all pairings under Teachers.</p>
    </div>
  );
}
