"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Menu, X, LogOut } from "lucide-react";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import type { AdminNavSection } from "@/lib/admin-nav";
import type { Role } from "@prisma/client";

interface AdminShellUser {
  name: string;
  email: string;
  roles: Role[];
}

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  PHARMACIST: "Pharmacist",
  INVENTORY_MANAGER: "Inventory Manager",
  CASHIER: "Cashier",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AdminShell({ user, navSections, children }: { user: AdminShellUser; navSections: AdminNavSection[]; children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-primary-dark lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-2 px-5">
          <Image src="/medora-mark.png" alt="Medora" width={28} height={28} className="h-7 w-7" />
          <span className="text-[15px] font-bold text-white">Medora</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">Admin</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <AdminSidebarNav sections={navSections} />
        </div>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-[11px] font-bold text-white">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-white">{user.name}</p>
              <p className="truncate text-[11px] text-white/50">{user.roles.map((r) => ROLE_LABELS[r]).join(", ")}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[264px] flex-col bg-primary-dark">
            <div className="flex h-16 shrink-0 items-center justify-between px-5">
              <div className="flex items-center gap-2">
                <Image src="/medora-mark.png" alt="Medora" width={28} height={28} className="h-7 w-7" />
                <span className="text-[15px] font-bold text-white">Medora</span>
              </div>
              <button type="button" onClick={() => setMobileNavOpen(false)} className="text-white/70 hover:text-white" aria-label="Close menu">
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              <AdminSidebarNav sections={navSections} onNavigate={() => setMobileNavOpen(false)} />
            </div>
            <div className="border-t border-white/10 p-3">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium text-white/70 hover:bg-white/5 hover:text-white"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <Image src="/medora-mark.png" alt="Medora" width={24} height={24} className="h-6 w-6" />
          </Link>
          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-tint text-[11px] font-bold text-primary">
              {initials(user.name)}
            </span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
