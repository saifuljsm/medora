"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import type { Role } from "@prisma/client";

interface AdminShellUser {
  name: string;
  email: string;
  roles: Role[];
}

export function AdminShell({ user, children }: { user: AdminShellUser; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2">
          <Image src="/medora-logo.png" alt="Medora" width={2251} height={727} className="h-8 w-auto" priority />
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Admin</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {user.name} · {user.roles.join(", ")}
          </span>
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
