"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AcademicYearCard } from "@/components/admin/semesters/academic-year-card";
import { AddSemesterForm } from "@/components/admin/semesters/add-semester-form";
import { ArchivedAcademicYears } from "@/components/admin/semesters/archived-academic-years";
import { ConfigureShiftingDialog } from "@/components/admin/semesters/configure-shifting-dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface ShiftingData {
  id: string;
  name: "FIRST" | "SECOND";
  startDate: string;
  endDate: string;
  requiredTeachingSessions: number;
  requiredFinalDemos: number;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED";
}

export interface SemesterData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  shiftings: ShiftingData[];
}

export interface AcademicYearData {
  id: string;
  label: string;
  semesters: SemesterData[];
}

export function SemestersPage() {
  const { data, isLoading, mutate } = useSWR<{ academicYears: AcademicYearData[] }>(
    "/api/semesters",
    fetcher,
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [configuringShiftingId, setConfiguringShiftingId] = useState<string | null>(null);

  const configuringShifting = data?.academicYears
    .flatMap((y) => y.semesters)
    .flatMap((s) => s.shiftings)
    .find((sh) => sh.id === configuringShiftingId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold">Semesters</h1>
        <Button onClick={() => setShowAddForm((v) => !v)}>+ Add Semester</Button>
      </div>

      {showAddForm && (
        <AddSemesterForm
          onCancel={() => setShowAddForm(false)}
          onCreated={() => {
            setShowAddForm(false);
            mutate();
          }}
        />
      )}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          {data?.academicYears.map((year) => (
            <AcademicYearCard
              key={year.id}
              year={year}
              onConfigureShifting={setConfiguringShiftingId}
              onActivated={() => mutate()}
            />
          ))}
          {data?.academicYears.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">No semesters yet. Add one to get started.</p>
          )}
        </div>
      )}

      <ArchivedAcademicYears />

      <ConfigureShiftingDialog
        shifting={configuringShifting ?? null}
        onOpenChange={(open) => !open && setConfiguringShiftingId(null)}
        onSaved={() => mutate()}
      />
    </div>
  );
}
