import { BrandCrest } from "@/components/brand-crest";
import { CtRegistrationForm } from "@/components/ct-registration-form";

export default function CtRegisterPage() {
  return (
    <div className="flex min-h-svh flex-1 items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandCrest />
          <h1 className="text-lg font-bold">Register as Cooperating Teacher</h1>
        </div>

        <div className="mt-6">
          <CtRegistrationForm />
        </div>
      </div>
    </div>
  );
}
