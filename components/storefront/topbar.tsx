import Link from "next/link";
import { Search, User, LayoutGrid, ShoppingCart } from "lucide-react";

export function Topbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto w-full max-w-[430px] sm:max-w-2xl md:max-w-4xl lg:max-w-6xl lg:px-8">
        <div className="flex items-center justify-between px-4 pb-2 pt-3 lg:px-0 lg:py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary">
              <span className="text-sm font-bold text-primary-foreground">M</span>
            </div>
            <div>
              <div className="text-[18px] font-bold leading-none tracking-tight text-foreground">Medora</div>
              <div className="hidden text-[10.5px] leading-tight text-muted-text lg:block">Genuine medicine, delivered</div>
            </div>
          </Link>

          {/* Desktop: search bar + nav links inline, no bottom nav (that's mobile-only). */}
          <div className="hidden flex-1 items-center gap-6 px-10 lg:flex">
            <Link href="/search" className="flex flex-1 items-center gap-2 rounded-xl bg-primary-tint px-4 py-2.5">
              <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={2} />
              <span className="text-sm text-muted-text">Search medicine, e.g. Napa</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium text-foreground">
              <Link href="/categories" className="flex items-center gap-1.5 hover:text-primary">
                <LayoutGrid className="h-4 w-4" strokeWidth={2} /> Categories
              </Link>
              <Link href="/cart" className="flex items-center gap-1.5 hover:text-primary">
                <ShoppingCart className="h-4 w-4" strokeWidth={2} /> Cart
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
