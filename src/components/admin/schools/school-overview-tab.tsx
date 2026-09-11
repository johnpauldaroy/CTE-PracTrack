"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SchoolDetailData } from "@/components/admin/schools/school-detail";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SupervisorOption {
  id: string;
  name: string;
  supervisorProfile: { department: string; schoolId: string | null } | null;
}

export function SchoolOverviewTab({
  school,
  onChanged,
}: {
  school: SchoolDetailData;
  onChanged: () => void;
}) {
  const { data: supervisorsData } = useSWR<{ supervisors: SupervisorOption[] }>(
    "/api/supervisors",
    fetcher,
  );
  const { data: internsData } = useSWR<{ interns: { absences: number }[] }>(
    `/api/schools/${school.id}/interns`,
    fetcher,
  );
  const [isAssigning, setIsAssigning] = useState(false);

  const internCount = internsData?.interns.length ?? 0;
  const flaggedCount = internsData?.interns.filter((i) => i.absences > 0).length ?? 0;

  async function handleAssign(supervisorUserId: string) {
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/schools/${school.id}/supervisor`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supervisorUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not assign supervisor.");
        return;
      }
      toast.success("Supervisor updated.");
      onChanged();
    } finally {
      setIsAssigning(false);
    }
  }

  const effectiveTimeIn = school.timeInCutoff ?? "using global default";
  const effectiveTimeOut = school.timeOutStart ?? "using global default";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Interns" value={internCount} />
        <StatCard label="Present Today" value="—" tone="success" />
        <StatCard label="Flagged" value={flaggedCount} tone="warning" />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h3 className="font-semibold">Supervisor Assignment</h3>
          {school.supervisorProfile ? (
            <p className="text-sm text-muted-foreground">
              {school.supervisorProfile.user.name} · {school.supervisorProfile.department}
            </p>
          ) : (
            <p className="text-sm text-warning font-medium">Not yet assigned</p>
          )}
          <div className="max-w-sm">
            <Select
              value={school.supervisorProfile?.user.id ?? undefined}
              onValueChange={(value) => value && handleAssign(value)}
              disabled={isAssigning}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Change Supervisor" />
              </SelectTrigger>
              <SelectContent>
                {supervisorsData?.supervisors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.supervisorProfile?.schoolId && s.supervisorProfile.schoolId !== school.id
                      ? " (currently assigned elsewhere)"
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h3 className="font-semibold">Location</h3>
          <div className="flex items-center justify-center rounded-lg border border-dashed bg-muted/50 py-10">
            <MapPin className="size-6 text-muted-foreground" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {Number(school.latitude).toFixed(4)}°N, {Number(school.longitude).toFixed(4)}°E ·{" "}
            {school.geofenceRadiusMeters}m geofence
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2 p-5">
          <h3 className="font-semibold">Check-in Settings</h3>
          <p className="text-sm text-muted-foreground">
            Time In cut-off:{" "}
            <span className={school.timeInCutoff ? "text-foreground font-medium" : ""}>
              {effectiveTimeIn}
            </span>
            {!school.timeInCutoff && " (using global default)"}
          </p>
          <p className="text-sm text-muted-foreground">
            Time Out start:{" "}
            <span className={school.timeOutStart ? "text-foreground font-medium" : ""}>
              {effectiveTimeOut}
            </span>
            {!school.timeOutStart && " (using global default)"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "success" | "warning";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p
          className={
            tone === "success"
              ? "text-3xl font-bold text-success"
              : tone === "warning"
                ? "text-3xl font-bold text-warning"
                : "text-3xl font-bold"
          }
        >
          {value}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
