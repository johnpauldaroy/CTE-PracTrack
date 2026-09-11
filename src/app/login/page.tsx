import { BrandCrest } from "@/components/brand-crest";
import { LoginForm } from "@/components/login-form";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-svh flex-1 items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandCrest />
          <div>
            <h1 className="text-xl font-bold">CTE PracTrack</h1>
            <p className="text-sm font-medium text-muted-foreground">Admin Dashboard</p>
            <p className="mt-1 text-xs text-muted-foreground">
              University of Antique — College of Teacher Education
            </p>
          </div>
        </div>

        <div className="mt-8">
          <LoginForm variant="admin" roleHomeMap={{ ADMIN: "/dashboard" }} />
        </div>
      </div>
    </div>
  );
}
