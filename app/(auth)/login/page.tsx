import { Suspense } from "react";
import { StaffLoginForm } from "@/components/auth/staff-login-form";

// This is the staff sign-in page (Phase 1.3). Customer-facing login
// (OTP + Google/Facebook, intercepted as a checkout-preserving modal at
// (auth)/@modal/(.)login) is Phase 2.

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8">
        <h1 className="mb-1 text-lg font-bold text-foreground">Staff sign in</h1>
        <p className="mb-6 text-sm text-muted-foreground">Medora Pharmacy admin</p>
        <Suspense>
          <StaffLoginForm />
        </Suspense>
      </div>
    </main>
  );
}
