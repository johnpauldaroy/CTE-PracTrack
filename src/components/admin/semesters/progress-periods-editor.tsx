"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PeriodDraft {
  id?: string;
  label: string;
  startDate: string;
  endDate: string;
  dueDate: string;
}

const day = (iso: string) => iso.slice(0, 10);

/**
 * How often interns submit a progress report: generate weekly (or every-N-days) periods,
 * or type specific date ranges. Saved per shifting; each period has its own due date.
 */
export function ProgressPeriodsEditor({ shiftingId }: { shiftingId: string }) {
  const [periods, setPeriods] = useState<PeriodDraft[]>([]);
  const [everyDays, setEveryDays] = useState(7);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shiftings/${shiftingId}/progress-periods`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setPeriods(
          (data.periods ?? []).map((p: PeriodDraft) => ({
            id: p.id,
            label: p.label,
            startDate: day(p.startDate),
            endDate: day(p.endDate),
            dueDate: day(p.dueDate),
          })),
        );
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [shiftingId]);

  async function generate() {
    const res = await fetch(`/api/shiftings/${shiftingId}/progress-periods?generate=${everyDays}`);
    const data = await res.json();
    if (!res.ok) return toast.error(data.error ?? "Could not generate periods.");
    // Keep ids of existing periods in order so a regenerate edits them in place where possible.
    setPeriods((current) => (data.periods as PeriodDraft[]).map((p, i) => ({ ...p, id: current[i]?.id })));
  }

  function update(index: number, patch: Partial<PeriodDraft>) {
    setPeriods((current) => current.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/shiftings/${shiftingId}/progress-periods`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periods }),
      });
      const data = await res.json();
      if (!res.ok) {
        const first = data.fieldErrors ? Object.values<string[]>(data.fieldErrors)[0]?.[0] : null;
        return toast.error(first ?? data.error ?? "Could not save the periods.");
      }
      setPeriods(
        data.periods.map((p: PeriodDraft) => ({
          id: p.id,
          label: p.label,
          startDate: day(p.startDate),
          endDate: day(p.endDate),
          dueDate: day(p.dueDate),
        })),
      );
      toast.success("Progress report schedule saved.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Progress report schedule</Label>
        <p className="text-xs text-muted-foreground">
          Interns submit one progress report per period to the school. Generate periods, or add specific date ranges.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="pp-every" className="text-xs">
            Every (days)
          </Label>
          <Input
            id="pp-every"
            type="number"
            min={1}
            max={60}
            className="w-24"
            value={everyDays}
            onChange={(e) => setEveryDays(Number(e.target.value))}
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={generate}>
          <Wand2 /> {everyDays === 7 ? "Generate weekly" : "Generate"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPeriods((c) => [...c, { label: `Period ${c.length + 1}`, startDate: "", endDate: "", dueDate: "" }])}
        >
          <Plus /> Add range
        </Button>
      </div>

      {periods.length === 0 ? (
        <p className="text-sm text-muted-foreground">No periods yet: interns have nothing to submit.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {periods.map((period, index) => (
            <li key={period.id ?? index} className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-lg border p-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  aria-label="Label"
                  className="col-span-2"
                  value={period.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                />
                <label className="text-xs text-muted-foreground">
                  Start
                  <Input type="date" value={period.startDate} onChange={(e) => update(index, { startDate: e.target.value })} />
                </label>
                <label className="text-xs text-muted-foreground">
                  End
                  <Input type="date" value={period.endDate} onChange={(e) => update(index, { endDate: e.target.value })} />
                </label>
                <label className="col-span-2 text-xs text-muted-foreground">
                  Due
                  <Input type="date" value={period.dueDate} onChange={(e) => update(index, { dueDate: e.target.value })} />
                </label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove period"
                onClick={() => setPeriods((c) => c.filter((_, i) => i !== index))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" size="sm" className="self-start" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save schedule"}
      </Button>
    </div>
  );
}
