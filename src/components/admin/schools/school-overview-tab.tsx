"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SchoolDetailData } from "@/components/admin/schools/school-detail";
import { LocationMap } from "@/components/maps/location-map";
import { EditSchoolSheet } from "@/components/admin/schools/edit-school-sheet";
import { DeleteSchoolDialog } from "@/components/admin/schools/delete-school-dialog";

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
  const { data: internsData } = useSWR<{ interns: { absences: number; isFlagged: boolean; timedInToday: boolean }[] }>(
    `/api/schools/${school.id}/interns`,
    fetcher,
  );
  const [isAssigning, setIsAssigning] = useState(false);
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const internCount = internsData?.interns.length ?? 0;
  // "Flagged" = interns with at least one ACTIVE alert, so it agrees with the dashboards.
  const flaggedCount = internsData?.interns.filter((i) => i.isFlagged).length ?? 0;
  const presentTodayCount = internsData?.interns.filter((i) => i.timedInToday).length ?? 0;

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

  const { data: globalCheckIn } = useSWR<{ config: { timeInCutoff: string; timeOutStart: string } }>(
    "/api/config/check-in",
    fetcher,
  );
  const effectiveTimeIn = school.timeInCutoff ?? globalCheckIn?.config.timeInCutoff ?? "…";
  const effectiveTimeOut = school.timeOutStart ?? globalCheckIn?.config.timeOutStart ?? "…";

  const [isEditingCheckIn, setIsEditingCheckIn] = useState(false);
  const [overrideTimeIn, setOverrideTimeIn] = useState(school.timeInCutoff ?? "");
  const [overrideTimeOut, setOverrideTimeOut] = useState(school.timeOutStart ?? "");
  const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);

  async function handleSaveCheckInOverride(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingCheckIn(true);
    try {
      const res = await fetch(`/api/schools/${school.id}/check-in-override`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeInCutoff: overrideTimeIn || null,
          timeOutStart: overrideTimeOut || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save check-in override.");
        return;
      }
      toast.success("Check-in settings updated.");
      setIsEditingCheckIn(false);
      onChanged();
    } finally {
      setIsSavingCheckIn(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Interns" value={internCount} />
        <StatCard label="Present Today" value={internsData ? `${presentTodayCount} / ${internCount}` : "—"} tone="success" />
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
              // Without `items`, the trigger renders the raw user id instead of the supervisor's name.
              items={Object.fromEntries((supervisorsData?.supervisors ?? []).map((s) => [s.id, s.name]))}
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
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Location</h3>
            <Button variant="outline" size="sm" onClick={() => setIsEditingSchool(true)}>
              <Pencil /> Edit
            </Button>
          </div>
          <div className="h-56 overflow-hidden rounded-lg border">
            <LocationMap
              latitude={Number(school.latitude)}
              longitude={Number(school.longitude)}
              radiusMeters={school.geofenceRadiusMeters}
              readOnly
              className="h-full w-full"
            />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {Number(school.latitude).toFixed(4)}°N, {Number(school.longitude).toFixed(4)}°E ·{" "}
            {school.geofenceRadiusMeters}m geofence
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Check-in Settings</h3>
            {!isEditingCheckIn && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingCheckIn(true)}>
                <Pencil /> Edit
              </Button>
            )}
          </div>

          {!isEditingCheckIn ? (
            <>
              <p className="text-sm text-muted-foreground">
                Time In cut-off:{" "}
                <span className={school.timeInCutoff ? "text-foreground font-medium" : ""}>
                  {effectiveTimeIn}
                </span>
                {!school.timeInCutoff && " (global default)"}
              </p>
              <p className="text-sm text-muted-foreground">
                Time Out start:{" "}
                <span className={school.timeOutStart ? "text-foreground font-medium" : ""}>
                  {effectiveTimeOut}
                </span>
                {!school.timeOutStart && " (global default)"}
              </p>
            </>
          ) : (
            <form onSubmit={handleSaveCheckInOverride} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="override-in">Time In cut-off (leave blank to use global default)</Label>
                <Input
                  id="override-in"
                  type="time"
                  value={overrideTimeIn}
                  onChange={(e) => setOverrideTimeIn(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="override-out">Time Out start (leave blank to use global default)</Label>
                <Input
                  id="override-out"
                  type="time"
                  value={overrideTimeOut}
                  onChange={(e) => setOverrideTimeOut(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isSavingCheckIn}>
                  {isSavingCheckIn ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingCheckIn(false)}>
                  <X /> Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Delete School</h3>
            <p className="text-sm text-muted-foreground">
              Hides the school everywhere and unassigns its supervisor. History is kept and it can be restored.
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setIsDeleting(true)}>
            <Trash2 /> Delete school
          </Button>
        </CardContent>
      </Card>

      <EditSchoolSheet school={school} open={isEditingSchool} onOpenChange={setIsEditingSchool} onSaved={onChanged} />
      <DeleteSchoolDialog
        school={school}
        internCount={internsData ? internCount : undefined}
        open={isDeleting}
        onOpenChange={setIsDeleting}
        onDeleted={() => router.push("/schools")}
      />
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
