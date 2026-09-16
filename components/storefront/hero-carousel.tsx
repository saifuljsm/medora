import Link from "next/link";
import { ShieldCheck, Leaf } from "lucide-react";

export function HeroCarousel() {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-primary-tint px-6 py-10 lg:px-12 lg:py-16">
      <Leaf className="absolute -right-4 -top-4 h-28 w-28 text-mint/15 lg:h-40 lg:w-40" strokeWidth={1} />
      <ShieldCheck className="absolute bottom-0 right-16 h-16 w-16 text-primary/10 lg:h-24 lg:w-24" strokeWidth={1} />

      <div className="relative max-w-lg">
        <h1 className="text-2xl font-bold leading-tight text-primary lg:text-4xl">
          Your health, <span className="text-mint">delivered with care</span>.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground lg:text-base">
          Genuine medicine from Kushtia&apos;s pharmacy, reviewed by a licensed pharmacist on every order.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/categories"
            className="flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
          >
            Browse medicines
          </Link>
          <Link
            href="/prescription-order"
            className="flex h-11 items-center justify-center rounded-xl border-[1.5px] border-primary bg-card px-6 text-sm font-semibold text-primary"
          >
            Upload prescription
          </Link>
        </div>
      </div>
    </div>
  );
}
