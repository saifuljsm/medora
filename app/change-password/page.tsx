import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/admin/change-password-form";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8">
        <h1 className="mb-1 text-lg font-bold text-foreground">Change password</h1>
        <p className="mb-6 text-sm text-muted-foreground">{session.user.email}</p>
        <ChangePasswordForm forced={session.user.mustChangePassword} redirectTo="/dashboard" />
      </div>
    </main>
  );
}
