"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyAccountTab } from "@/components/admin/settings/my-account-tab";
import { FlaggingRulesTab } from "@/components/admin/settings/flagging-rules-tab";
import { CheckInSettingsTab } from "@/components/admin/settings/check-in-settings-tab";
import type { SessionUser } from "@/lib/auth";

export function SettingsPage({ user }: { user: SessionUser }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-bold">Settings</h1>

      <Tabs defaultValue="account">
        <TabsList className="grid w-full grid-cols-3 sm:w-fit">
          <TabsTrigger value="account">My Account</TabsTrigger>
          <TabsTrigger value="flagging">Flagging Rules</TabsTrigger>
          <TabsTrigger value="checkin">Check-in</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <MyAccountTab user={user} />
        </TabsContent>
        <TabsContent value="flagging" className="mt-6">
          <FlaggingRulesTab />
        </TabsContent>
        <TabsContent value="checkin" className="mt-6">
          <CheckInSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
