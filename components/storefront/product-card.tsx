import Link from "next/link";
import { Pill } from "lucide-react";

export interface StorefrontProductCard {
  id: string;
  slug: string | null;
  brandName: string;
  genericLabel: string;
  images: string[];
  requiresPrescription: boolean;
  stock: number;
  mrp: number | null;
  price: number;
  priceLabel: string; // e.g. "" or "from" for per-piece breakable products
}

function stockLabel(stock: number): { text: string; className: string } {
  if (stock <= 0) return { text: "Out of stock", className: "text-destructive" };
  if (stock <= 10) return { text: "Only a few left", className: "text-warning" };
  return { text: "In stock", className: "text-success" };
}

export function ProductCard({ product, wide = false }: { product: StorefrontProductCard; wide?: boolean }) {
  const stock = stockLabel(product.stock);
  const offPercent = product.mrp && product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  const href = product.slug ? `/medicines/${product.slug}` : `#`;

  return (
    <Link
      href={href}
      className={`group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md ${wide ? "" : "w-[142px] shrink-0"}`}
    >
      <div className="relative flex aspect-[1/0.85] items-center justify-center overflow-hidden bg-gradient-to-br from-primary-tint to-primary-tint-strong">
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.brandName}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Pill className="h-[38%] w-[38%] text-primary opacity-85 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.6} />
        )}
        {offPercent > 0 && (
          <span className="absolute left-[7px] top-[7px] rounded-[5px] bg-success px-[6px] py-[2.5px] text-[10px] font-bold text-white">
            {offPercent}% off
          </span>
        )}
        {product.requiresPrescription && (
          <span className="absolute right-[7px] top-[7px] rounded-[5px] border border-warning bg-warning-tint px-[5px] py-[2.5px] text-[9px] font-bold text-warning">
            Rx
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-[3px] p-[9px_10px_10px]">
        <div className="line-clamp-2 min-h-8 text-[12.5px] font-semibold leading-[1.3] text-foreground transition-colors group-hover:text-primary">
          {product.brandName}
        </div>
        <div className="text-[10.5px] text-muted-text">{product.genericLabel}</div>
        <div className="mt-0.5 flex items-baseline gap-[5px]">
          <span className="text-[14px] font-bold text-primary">
            {product.priceLabel ? `${product.priceLabel} ` : ""}৳{product.price.toFixed(2)}
          </span>
          {offPercent > 0 && <span className="text-[11px] text-muted-text line-through">৳{product.mrp!.toFixed(2)}</span>}
        </div>
        <span className={`text-[10px] ${stock.className}`}>{stock.text}</span>
      </div>
    </Link>
  );
}
