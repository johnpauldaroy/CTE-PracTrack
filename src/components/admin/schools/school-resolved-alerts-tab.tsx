"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ResolvedAlert {
  id: string;
  detail: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  intern: { user: { name: string } };
  resolvedByUser: { name: string } | null;
}

export function SchoolResolvedAlertsTab({ schoolId }: { schoolId: string }) {
  const { data, isLoading } = useSWR<{ alerts: ResolvedAlert[] }>(
    `/api/schools/${schoolId}/resolved-alerts`,
    fetcher,
  );

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const alerts = data?.alerts ?? [];

  if (alerts.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No resolved alerts yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((alert) => (
        <Card key={alert.id}>
          <CardContent className="flex flex-col gap-1 p-5">
            <p className="text-xs text-muted-foreground">
              {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : ""}
            </p>
            <p className="font-semibold">{alert.intern.user.name}</p>
            <p className="text-sm text-muted-foreground">Flag: {alert.detail}</p>
            <p className="text-sm text-muted-foreground">
              Resolved by: {alert.resolvedByUser?.name ?? "—"}
            </p>
            {alert.resolutionNote && (
              <p className="mt-1 text-sm italic">&ldquo;{alert.resolutionNote}&rdquo;</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
