"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InternsAccountsTab } from "@/components/admin/accounts/interns-accounts-tab";
import { SupervisorsAccountsTab } from "@/components/admin/accounts/supervisors-accounts-tab";
import { CtsAccountsTab } from "@/components/admin/accounts/cts-accounts-tab";

export function AccountsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-bold">Accounts</h1>

      <Tabs defaultValue="interns">
        <TabsList className="grid w-full grid-cols-3 sm:w-fit">
          <TabsTrigger value="interns">Interns</TabsTrigger>
          <TabsTrigger value="supervisors">Supervisors</TabsTrigger>
          <TabsTrigger value="cts">Cooperating Teachers</TabsTrigger>
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
