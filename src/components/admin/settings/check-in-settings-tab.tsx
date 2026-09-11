"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CheckInConfig {
  timeInCutoff: string;
  timeOutStart: string;
}

export function CheckInSettingsTab() {
  const { data, isLoading, mutate } = useSWR<{ config: CheckInConfig }>("/api/config/check-in", fetcher);

  if (isLoading || !data?.config) return <Skeleton className="h-72 w-full max-w-md" />;

  return (
    <CheckInSettingsForm
      key={`${data.config.timeInCutoff}:${data.config.timeOutStart}`}
      config={data.config}
      onSaved={() => void mutate()}
    />
  );
}

function CheckInSettingsForm({ config, onSaved }: { config: CheckInConfig; onSaved: () => void }) {
  const [timeInCutoff, setTimeInCutoff] = useState(config.timeInCutoff);
  const [timeOutStart, setTimeOutStart] = useState(config.timeOutStart);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/config/check-in", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeInCutoff, timeOutStart }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Could not save check-in settings.");
        return;
      }
      toast.success("Check-in settings updated.");
      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-md">
      <CardContent className="p-5">
        <p className="mb-4 text-sm text-muted-foreground">
          Global check-in settings apply to all schools unless a school sets its own override.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ci-in" className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> Time In cut-off:
            </Label>
            <Input id="ci-in" type="time" required value={timeInCutoff} onChange={(e) => setTimeInCutoff(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Interns who record Time In after this time are marked Late.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ci-out" className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> Time Out start:
            </Label>
            <Input id="ci-out" type="time" required value={timeOutStart} onChange={(e) => setTimeOutStart(e.target.value)} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>

          <p className="text-xs text-muted-foreground">
            To set a school-specific Time In cut-off, go to Schools → [School Name] → Overview →
            Check-in Settings.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
