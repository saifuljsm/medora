"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Search, Home, ShoppingCart, User } from "lucide-react";

const TABS = [
  { href: "/categories", label: "Categories", icon: LayoutGrid },
  { href: "/search", label: "Search", icon: Search },
  { href: "/", label: "Home", icon: Home },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/account", label: "Account", icon: User },
] as const;

export function BottomNav({ cartCount = 0 }: { cartCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex w-full max-w-[430px] sm:max-w-2xl md:max-w-4xl">
        {TABS.map((tab) => {
          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 ${
                isActive ? "text-primary" : "text-muted-text"
              }`}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
              <span className="text-[10.5px] font-medium">{tab.label}</span>
              {tab.href === "/cart" && cartCount > 0 && (
                <span className="absolute right-[calc(50%-20px)] top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-mint px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
