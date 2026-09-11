"use client";

import useSWR from "swr";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InternDetail {
  id: string;
  schoolNumber: string;
  course: string;
  yearLevel: string;
  user: { name: string; email: string };
  assignedSchool: { name: string };
  cooperatingTeacher: { user: { name: string } } | null;
}

function NotYetAvailable({ module }: { module: string }) {
  return (
    <p className="py-10 text-center text-sm text-muted-foreground">
      {module} isn&apos;t available yet — this module hasn&apos;t been built.
    </p>
  );
}

export function InternDetailSheet({
  internId,
  onOpenChange,
}: {
  internId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useSWR<{ intern: InternDetail }>(
    internId ? `/api/accounts/interns/${internId}` : null,
    fetcher,
  );

  return (
    <Sheet open={!!internId} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {isLoading || !data?.intern ? (
          <div className="flex flex-col gap-3 px-4 pt-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{data.intern.user.name}</SheetTitle>
              <p className="text-sm text-muted-foreground">
                School ID: {data.intern.schoolNumber} &nbsp;&nbsp; Course: {data.intern.course} &nbsp;&nbsp;
                School: {data.intern.assignedSchool.name}
              </p>
            </SheetHeader>

            <div className="px-4 pb-4">
              <Tabs defaultValue="dtr">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="dtr">DTR</TabsTrigger>
                  <TabsTrigger value="sessions">Sessions</TabsTrigger>
                  <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>
                <TabsContent value="dtr" className="mt-4">
                  <NotYetAvailable module="Attendance (DTR)" />
                </TabsContent>
                <TabsContent value="sessions" className="mt-4">
                  <NotYetAvailable module="Teaching sessions" />
                </TabsContent>
                <TabsContent value="evaluations" className="mt-4">
                  <NotYetAvailable module="Evaluations" />
                </TabsContent>
                <TabsContent value="documents" className="mt-4">
                  <NotYetAvailable module="Documents" />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
