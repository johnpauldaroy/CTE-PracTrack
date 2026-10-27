"use client";

import useSWR from "swr";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { InternDtrTab } from "@/components/mobile/supervisor/intern-dtr-tab";
import { InternSessionsTab } from "@/components/interns/intern-sessions-tab";
import { InternEvaluationsTab } from "@/components/interns/intern-evaluations-tab";
import { InternDocumentsTab } from "@/components/interns/intern-documents-tab";

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
                  <InternDtrTab internId={data.intern.id} />
                </TabsContent>
                <TabsContent value="sessions" className="mt-4">
                  <InternSessionsTab internId={data.intern.id} />
                </TabsContent>
                <TabsContent value="evaluations" className="mt-4">
                  <InternEvaluationsTab internId={data.intern.id} />
                </TabsContent>
                <TabsContent value="documents" className="mt-4">
                  <InternDocumentsTab internId={data.intern.id} />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
