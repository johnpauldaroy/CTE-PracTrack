"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { SchoolDetailData } from "@/components/admin/schools/school-detail";
import { LocationMap } from "@/components/maps/location-map";
import { EditSchoolSheet } from "@/components/admin/schools/edit-school-sheet";
import { DeleteSchoolDialog } from "@/components/admin/schools/delete-school-dialog";
import { CHECK_IN_FIELD_KEYS, CheckInFields, type CheckInFieldKey, type CheckInValues } from "@/components/admin/check-in-fields";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SupervisorOption {
  id: string;
  name: string;
  supervisorProfile: { schools: { schoolId: string }[] } | null;
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

  const { data: globalCheckIn } = useSWR<{ config: CheckInValues }>("/api/config/check-in", fetcher);
  const overrides = (): Record<CheckInFieldKey, string> =>
    Object.fromEntries(CHECK_IN_FIELD_KEYS.map((key) => [key, school[key] ?? ""])) as Record<CheckInFieldKey, string>;

  const [isEditingCheckIn, setIsEditingCheckIn] = useState(false);
  const [overrideValues, setOverrideValues] = useState<Record<CheckInFieldKey, string>>(overrides);
  const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);

  async function handleSaveCheckInOverride(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingCheckIn(true);
    try {
      const res = await fetch(`/api/schools/${school.id}/check-in-override`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(CHECK_IN_FIELD_KEYS.map((key) => [key, overrideValues[key] || null])),
        ),
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
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard label="Interns" value={internCount} />
        <StatCard label="Present Today" value={internsData ? `${presentTodayCount} / ${internCount}` : "—"} tone="success" />
        <StatCard label="Flagged" value={flaggedCount} tone="warning" />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h3 className="font-semibold">Supervisor Assignment</h3>
          {school.supervisorProfile ? (
            <p className="text-sm text-muted-foreground">
              {school.supervisorProfile.user.name}
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
                    {(() => {
                      const others = s.supervisorProfile?.schools.filter((entry) => entry.schoolId !== school.id).length ?? 0;
                      return others ? ` (also covers ${others} other school${others > 1 ? "s" : ""})` : "";
                    })()}
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
            <div className="grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
              {(
                [
                  ["amTimeInCutoff", "Morning Time In cut-off"],
                  ["amTimeOutStart", "Morning Time Out start"],
                  ["pmTimeInCutoff", "Afternoon Time In cut-off"],
                  ["pmTimeOutStart", "Afternoon Time Out start"],
                  ["pmWindowOpensAt", "Afternoon begins at"],
                ] as [CheckInFieldKey, string][]
              ).map(([key, label]) => (
                <p key={key}>
                  {label}:{" "}
                  <span className={school[key] ? "font-medium text-foreground" : ""}>
                    {school[key] ?? globalCheckIn?.config[key] ?? "…"}
                  </span>
                  {!school[key] && " (global default)"}
                </p>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSaveCheckInOverride} className="flex flex-col gap-4">
              <CheckInFields
                idPrefix="override"
                optional
                values={overrideValues}
                placeholders={globalCheckIn?.config}
                onChange={(key, value) => setOverrideValues((current) => ({ ...current, [key]: value }))}
              />
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
      <CardContent className="p-3 sm:p-5">
        <p
          className={
            tone === "success"
              ? "text-xl font-bold sm:text-3xl text-success"
              : tone === "warning"
                ? "text-xl font-bold sm:text-3xl text-warning"
                : "text-xl font-bold sm:text-3xl"
          }
        >
          {value}
        </p>
        <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      </CardContent>
    </Card>
  );
}
