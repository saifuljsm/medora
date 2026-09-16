import Link from "next/link";
import Image from "next/image";
import { Search, User, LayoutGrid, ShoppingCart } from "lucide-react";

export function Topbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto w-full max-w-[430px] sm:max-w-2xl md:max-w-4xl lg:max-w-none lg:px-8 xl:px-12">
        <div className="flex items-center justify-between px-4 pb-2 pt-3 lg:px-0 lg:py-4">
          <Link href="/" className="flex shrink-0 items-center">
            <Image src="/medora-logo.png" alt="Medora" width={218} height={73} className="h-8 w-auto" priority />
          </Link>

          {/* Desktop: search bar + nav links inline, no bottom nav (that's mobile-only). */}
          <div className="hidden flex-1 items-center gap-6 px-10 lg:flex">
            <Link href="/search" className="flex max-w-xl flex-1 items-center gap-2 rounded-xl bg-primary-tint px-4 py-2.5">
              <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={2} />
              <span className="text-sm text-muted-text">Search medicine, e.g. Napa</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium text-foreground">
              <Link href="/categories" className="flex items-center gap-1.5 hover:text-primary">
                <LayoutGrid className="h-4 w-4" strokeWidth={2} /> Categories
              </Link>
              <Link href="/cart" className="flex items-center gap-1.5 hover:text-primary">
                <span className="relative">
                  <ShoppingCart className="h-4 w-4" strokeWidth={2} />
                  {/* TODO(Phase 2.4): real cart count once the Redis-backed cart exists — 0 is accurate today. */}
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-mint text-[8px] font-bold text-white">
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
            <Link
              href="/account"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-border bg-card"
              aria-label="Account"
            >
              <User className="h-[19px] w-[19px] text-foreground" strokeWidth={2} />
            </Link>
          </div>
        </div>
        <div className="px-4 pb-3 lg:hidden">
          <Link href="/search" className="flex items-center gap-2 rounded-xl bg-primary-tint px-3 py-2.5">
            <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={2} />
            <span className="text-[14.5px] text-muted-text">Search medicine, e.g. Napa</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
