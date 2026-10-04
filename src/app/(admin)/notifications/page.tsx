import { NotificationList } from "@/components/notifications/notification-list";

export default function AdminNotificationsPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">CT registrations awaiting approval and high-severity intern alerts.</p>
      </div>
      <NotificationList />
    </div>
  );
}
