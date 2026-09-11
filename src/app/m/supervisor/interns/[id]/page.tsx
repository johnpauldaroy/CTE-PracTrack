"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { InternDtrTab } from "@/components/mobile/supervisor/intern-dtr-tab";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InternDetail {
  id: string;
  schoolNumber: string;
  course: string;
  user: { name: string };
  assignedSchool: { name: string };
}

function NotYetAvailable({ module }: { module: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{module} isn&apos;t available yet.</p>;
}

export default function SupervisorInternDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useSWR<{ intern: InternDetail }>(`/api/accounts/interns/${id}`, fetcher);

  return (
    <div className="flex flex-col gap-4 p-4">
      <Link href="/m/supervisor/interns" className="text-sm text-muted-foreground hover:underline">
        ← Back
      </Link>

      {isLoading || !data?.intern ? (
        <Skeleton className="h-8 w-48" />
      ) : (
        <div>
          <h1 className="font-heading text-xl font-bold">{data.intern.user.name}</h1>
          <p className="text-sm text-muted-foreground">
            {data.intern.schoolNumber} · {data.intern.course} · {data.intern.assignedSchool.name}
          </p>
        </div>
      )}

      <Tabs defaultValue="dtr">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dtr">DTR</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>
        <TabsContent value="dtr" className="mt-4">
          <InternDtrTab internId={id} />
        </TabsContent>
        <TabsContent value="sessions" className="mt-4">
          <NotYetAvailable module="Teaching sessions" />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <NotYetAvailable module="Documents" />
        </TabsContent>
        <TabsContent value="alerts" className="mt-4">
          <NotYetAvailable module="Alerts" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
