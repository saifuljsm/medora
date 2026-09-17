"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  ClipboardList,
  AlertTriangle,
  Undo2,
  Wallet,
  BarChart3,
  Tag,
  Bike,
  FileCheck2,
  Settings,
  BookMarked,
  type LucideIcon,
} from "lucide-react";
import type { AdminNavSection, AdminNavIconName } from "@/lib/admin-nav";

const ICONS: Record<AdminNavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  orders: Package,
  returns: Undo2,
  products: Package,
  referenceData: BookMarked,
  purchaseOrders: ClipboardList,
  suppliers: Truck,
  quickEntry: ClipboardList,
  adjustments: AlertTriangle,
  expiry: AlertTriangle,
  prescriptions: FileCheck2,
  couriers: Bike,
  reconciliation: Wallet,
  coupons: Tag,
  reports: BarChart3,
  settings: Settings,
};

export function AdminSidebarNav({ sections, onNavigate }: { sections: AdminNavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 px-3 text-[10.5px] font-bold uppercase tracking-wider text-white/40">{section.label}</p>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
              const Icon = ICONS[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                    isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`h-[17px] w-[17px] shrink-0 ${isActive ? "text-mint" : "text-white/50"}`} strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
