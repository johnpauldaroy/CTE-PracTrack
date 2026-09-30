"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InternsAccountsTab } from "@/components/admin/accounts/interns-accounts-tab";
import { SupervisorsAccountsTab } from "@/components/admin/accounts/supervisors-accounts-tab";
import { CtsAccountsTab } from "@/components/admin/accounts/cts-accounts-tab";
import { GraduationCap, School, UsersRound } from "lucide-react";

export function AccountsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage access and assignments across every PracTrack role.</p>
      </div>

      <Tabs defaultValue="interns">
        <TabsList className="grid w-full grid-cols-3 sm:w-fit">
          <TabsTrigger value="interns"><GraduationCap /> Interns</TabsTrigger>
          <TabsTrigger value="supervisors"><UsersRound /> Supervisors</TabsTrigger>
          <TabsTrigger value="cts"><School /> Cooperating Teachers</TabsTrigger>
        </TabsList>

        <TabsContent value="interns" className="mt-6">
          <InternsAccountsTab />
        </TabsContent>
        <TabsContent value="supervisors" className="mt-6">
          <SupervisorsAccountsTab />
        </TabsContent>
        <TabsContent value="cts" className="mt-6">
          <CtsAccountsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
