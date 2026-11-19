"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CHECK_IN_FIELD_KEYS, CheckInFields, type CheckInValues } from "@/components/admin/check-in-fields";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function CheckInSettingsTab() {
  const { data, isLoading, mutate } = useSWR<{ config: CheckInValues }>("/api/config/check-in", fetcher);

  if (isLoading || !data?.config) return <Skeleton className="h-96 w-full max-w-md" />;

  return (
    <CheckInSettingsForm
      key={CHECK_IN_FIELD_KEYS.map((key) => data.config[key]).join(":")}
      config={data.config}
      onSaved={() => void mutate()}
    />
  );
}

function CheckInSettingsForm({ config, onSaved }: { config: CheckInValues; onSaved: () => void }) {
  const [values, setValues] = useState<CheckInValues>(() =>
    Object.fromEntries(CHECK_IN_FIELD_KEYS.map((key) => [key, config[key]])) as CheckInValues,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/config/check-in", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await res.json();
      if (!res.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        toast.error(
          result.fieldErrors ? "Please fix the highlighted times." : (result.error ?? "Could not save check-in settings."),
        );
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
          Interns time in and out twice a day: morning and afternoon. These global times apply to all schools unless a
          school sets its own override.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <CheckInFields
            idPrefix="ci"
            values={values}
            onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
          />
          {Object.entries(fieldErrors).map(([field, messages]) => (
            <p key={field} className="text-xs text-destructive">
              {messages[0]}
            </p>
          ))}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Changes apply from now on; days already recorded keep the status they were given. To set school-specific
            times, go to Schools → [School Name] → Overview → Check-in Settings.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
