import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

// UX-level gate: redirects unauthenticated staff to /login and forces a
// password change on first login before anything else in (admin) renders.
// This is not the security boundary by itself — every admin server action
// independently calls assertCan() (lib/permissions.ts), which is what
// actually enforces role scope.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");

  return <AdminShell user={session.user}>{children}</AdminShell>;
}
