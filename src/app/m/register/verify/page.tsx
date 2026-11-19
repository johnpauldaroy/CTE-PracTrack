import { Suspense } from "react";
import { BrandCrest } from "@/components/brand-crest";
import { VerifyEmailForm } from "@/components/verify-email-form";

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-svh flex-1 items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandCrest />
          <h1 className="text-lg font-bold">Verify your email</h1>
        </div>

        <div className="mt-6">
          <Suspense>
            <VerifyEmailForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
