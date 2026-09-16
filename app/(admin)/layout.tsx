import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { getVisibleNavSections } from "@/lib/admin-nav";

// UX-level gate: redirects unauthenticated staff to /login and forces a
// password change on first login before anything else in (admin) renders.
// This is not the security boundary by itself — every admin server action
// independently calls assertCan() (lib/permissions.ts), which is what
// actually enforces role scope. The sidebar nav below is filtered by the
// same capability checks purely for UX (no dead links a role can't use),
// not as a security control.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.type !== "staff") redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");

  const navSections = getVisibleNavSections(session.user);

  return (
    <AdminShell user={session.user} navSections={navSections}>
      {children}
    </AdminShell>
  );
}
