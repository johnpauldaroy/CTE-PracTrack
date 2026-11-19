import { BrandCrest } from "@/components/brand-crest";
import { InternRegistrationForm } from "@/components/intern-registration-form";

export default function InternRegisterPage() {
  return (
    <div className="relative flex min-h-svh flex-1 items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandCrest />
          <h1 className="text-lg font-bold">Register as Student Intern</h1>
        </div>

        <div className="mt-6">
          <InternRegistrationForm />
        </div>
      </div>
    </div>
  );
}
