import Link from "next/link";
import Image from "next/image";
import { Search, User, LayoutGrid, ShoppingCart } from "lucide-react";

export function Topbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto w-full max-w-[430px] sm:max-w-2xl md:max-w-4xl lg:max-w-none lg:px-8 xl:px-12">
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3 lg:px-0 lg:py-3.5">
          <Link href="/" className="flex shrink-0 items-center">
            <Image src="/medora-logo.png" alt="Medora" width={218} height={73} className="h-7 w-auto lg:h-8" priority />
          </Link>

          {/* Desktop: search bar + nav links inline, no bottom nav (that's mobile-only). */}
          <div className="hidden flex-1 items-center gap-8 lg:flex">
            <Link href="/search" className="flex max-w-xl flex-1 items-center rounded-xl bg-primary-tint py-1 pl-4 pr-1">
              <span className="flex-1 text-sm text-muted-text">Search medicine, e.g. Napa</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint">
                <Search className="h-4 w-4 text-white" strokeWidth={2.5} />
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium text-foreground">
              <Link href="/categories" className="flex items-center gap-1.5 hover:text-primary">
                <LayoutGrid className="h-4 w-4" strokeWidth={2} /> Categories
              </Link>
              <Link href="/cart" className="flex items-center gap-1.5 hover:text-primary">
                <span className="relative">
                  <ShoppingCart className="h-4 w-4" strokeWidth={2} />
                  {/* TODO(Phase 2.4): real cart count once the Redis-backed cart exists — 0 is accurate today. */}
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success text-[8px] font-bold text-white">
                    0
                  </span>
                </span>
                Cart
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Bangla toggle is visual-only for now — full i18n content isn't in this phase's scope. */}
            <div className="hidden overflow-hidden rounded-full border border-border text-[11px] font-semibold sm:flex">
              <span className="bg-primary px-[9px] py-1.5 text-white">EN</span>
              <span className="px-[9px] py-1.5 text-muted-text">বাং</span>
            </div>
            {/* TODO: customer auth doesn't exist yet — this always reads "Account", not a real
                Sign In / Profile distinction, since there's no session to tell them apart. */}
            <Link
              href="/account"
              className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground lg:h-[38px]"
            >
              <User className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">Account</span>
            </Link>
          </div>
        </div>
        <div className="px-4 pb-3 lg:hidden">
          <Link href="/search" className="flex items-center rounded-xl bg-primary-tint py-1 pl-3 pr-1">
            <span className="flex-1 text-[14.5px] text-muted-text">Search medicine, e.g. Napa</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint">
              <Search className="h-4 w-4 text-white" strokeWidth={2.5} />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
