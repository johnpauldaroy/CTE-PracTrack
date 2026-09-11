"use client";

import useSWR from "swr";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { SchoolOverviewTab } from "@/components/admin/schools/school-overview-tab";
import { SchoolInternsTab } from "@/components/admin/schools/school-interns-tab";
import { SchoolResolvedAlertsTab } from "@/components/admin/schools/school-resolved-alerts-tab";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SchoolDetail({ schoolId }: { schoolId: string }) {
  const { data, isLoading, mutate } = useSWR<{ school: SchoolDetailData }>(
    `/api/schools/${schoolId}`,
    fetcher,
  );

  if (isLoading || !data?.school) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const school = data.school;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/schools" className="text-sm text-muted-foreground hover:underline">
          ← Schools
        </Link>
        <h1 className="font-heading mt-1 text-3xl font-bold">{school.name}</h1>
        <p className="text-sm text-muted-foreground">
          {school.type === "SECONDARY" ? "Secondary" : "Elementary"} · {school.municipality}, Antique
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3 sm:w-fit">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="interns">Interns</TabsTrigger>
          <TabsTrigger value="resolved-alerts">Resolved Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <SchoolOverviewTab school={school} onChanged={() => mutate()} />
        </TabsContent>
        <TabsContent value="interns" className="mt-6">
          <SchoolInternsTab schoolId={schoolId} />
        </TabsContent>
        <TabsContent value="resolved-alerts" className="mt-6">
          <SchoolResolvedAlertsTab schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export interface SchoolDetailData {
  id: string;
  name: string;
  type: "SECONDARY" | "ELEMENTARY";
  municipality: string;
  latitude: string;
  longitude: string;
  geofenceRadiusMeters: number;
  timeInCutoff: string | null;
  timeOutStart: string | null;
  supervisorProfile: { user: { id: string; name: string }; department: string } | null;
}
