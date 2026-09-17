import Link from "next/link";
import Image from "next/image";
import { User, ShoppingCart } from "lucide-react";
import { HeaderSearch } from "@/components/storefront/header-search";

export function Topbar({ cartCount = 0, customerName }: { cartCount?: number; customerName?: string | null }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto w-full max-w-[430px] sm:max-w-2xl md:max-w-4xl lg:max-w-none lg:px-8 xl:px-12">
        {/* Mobile row: logo + account icon only — search lives in its own compact row below. */}
        <div className="flex items-center justify-between gap-3 px-0 pb-2 pt-3 lg:hidden">
          <Link href="/" className="flex shrink-0 items-center">
            <Image src="/medora-logo.png" alt="Medora" width={2251} height={727} className="h-8 w-auto" priority />
          </Link>
          <Link
            href="/account"
            className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground"
          >
            <User className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">{customerName ? customerName.split(" ")[0] : "Sign In"}</span>
          </Link>
        </div>

        {/* Desktop: logo left, search centered, cart + sign in right. */}
        <div className="hidden items-center gap-6 py-3.5 lg:flex">
          <Link href="/" className="flex shrink-0 items-center">
            <Image src="/medora-logo.png" alt="Medora" width={2251} height={727} className="h-11 w-auto" priority />
          </Link>

          <div className="flex flex-1 justify-center">
            <HeaderSearch />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-mint text-white transition-colors hover:bg-mint-dark"
            >
              <ShoppingCart className="h-[18px] w-[18px]" strokeWidth={2} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-success px-1 text-[9px] font-bold text-white ring-2 ring-card">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/account"
              className="flex h-[38px] items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-foreground"
            >
              <User className="h-4 w-4" strokeWidth={2} />
              <span>{customerName ? customerName.split(" ")[0] : "Sign In"}</span>
            </Link>
          </div>
        </div>

        <div className="px-0 pb-3 lg:hidden">
          <HeaderSearch compact />
        </div>
      </div>
    </header>
  );
}
