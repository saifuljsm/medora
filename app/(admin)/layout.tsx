// TODO(Phase 1.3): gate this layout on a staff session — redirect to /login
// when unauthenticated, and force /change-password when
// session.user.mustChangePassword is true. Every admin server action
// already calls assertCan() independently, so this layout is a UX
// convenience, not the security boundary.

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
