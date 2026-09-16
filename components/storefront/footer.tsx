import Link from "next/link";
import { Phone, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-8 border-t border-border bg-card">
      <div className="mx-auto grid max-w-[430px] grid-cols-2 gap-8 px-4 py-8 sm:max-w-2xl md:max-w-4xl lg:max-w-none lg:grid-cols-4 lg:px-8 xl:px-12">
        <div className="col-span-2 lg:col-span-1">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary">
              <span className="text-sm font-bold text-primary-foreground">M</span>
            </div>
            <span className="text-base font-bold text-foreground">Medora</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Kushtia&apos;s pharmacy, online. Run by a licensed team you can reach directly by phone or WhatsApp.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-text">Shop</h3>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/categories" className="hover:text-primary">
                All categories
              </Link>
            </li>
            <li>
              <Link href="/search" className="hover:text-primary">
                Search medicine
              </Link>
            </li>
            <li>
              <Link href="/prescription-order" className="hover:text-primary">
                Upload prescription
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-primary">
                Cart
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-text">Account</h3>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/account" className="hover:text-primary">
                My account
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-text">Talk to us</h3>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>
              <a href="tel:09642000000" className="flex items-center gap-1.5 hover:text-primary">
                <Phone className="h-3.5 w-3.5" strokeWidth={2} /> 09642-XXXXXX
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/8809642000000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-primary"
              >
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} /> WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-[430px] border-t border-border px-4 py-4 text-center text-[11px] text-muted-text sm:max-w-2xl md:max-w-4xl lg:max-w-none lg:px-8 xl:px-12">
        © {new Date().getFullYear()} Medora, ZAZ Technology. All rights reserved.
      </div>
    </footer>
  );
}
