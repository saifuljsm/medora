import Link from "next/link";
import Image from "next/image";
import { Phone, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-8 bg-foreground text-background">
      <div className="mx-auto grid max-w-[430px] grid-cols-1 gap-8 px-0 py-10 sm:max-w-2xl md:max-w-4xl lg:max-w-6xl lg:grid-cols-3 lg:gap-6 lg:px-8">
        <div>
          <Image src="/medora-mark.png" alt="Medora" width={32} height={32} className="mb-2 h-8 w-8" />
          <p className="mb-1 text-sm font-bold">Medora</p>
          <p className="text-xs leading-relaxed text-background/70">
            Kushtia&apos;s pharmacy, online. Run by a licensed team you can reach directly by phone or WhatsApp.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-background/50">Quick links</h3>
          <ul className="flex flex-col gap-2 text-sm text-background/80">
            <li>
              <Link href="/categories" className="hover:text-background">
                All categories
              </Link>
            </li>
            <li>
              <Link href="/search" className="hover:text-background">
                Search medicine
              </Link>
            </li>
            <li>
              <Link href="/prescription-order" className="hover:text-background">
                Upload prescription
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-background">
                Cart
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:text-background">
                My account
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-background/50">Contact us</h3>
          <ul className="flex flex-col gap-2 text-sm text-background/80">
            <li>
              <a href="tel:09642000000" className="flex items-center gap-1.5 hover:text-background">
                <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> 09642-XXXXXX
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/8809642000000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-background"
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-[430px] border-t border-background/15 px-0 py-4 text-center text-[11px] text-background/50 sm:max-w-2xl md:max-w-4xl lg:max-w-6xl lg:px-8">
        © {new Date().getFullYear()} Medora. All rights reserved.
      </div>
    </footer>
  );
}
