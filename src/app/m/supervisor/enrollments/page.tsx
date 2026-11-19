"use client";

import { EnrollmentRequests } from "@/components/enrollment-requests";

export default function SupervisorEnrollmentsPage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="font-heading text-xl font-bold">Enrollment Requests</h1>
        <p className="text-sm text-muted-foreground">
          Interns who registered for your school(s). Confirm them to let them sign in.
        </p>
      </div>
      <EnrollmentRequests />
    </div>
  );
}
