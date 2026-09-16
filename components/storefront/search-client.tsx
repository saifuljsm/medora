"use client";

import { useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductCard, type StorefrontProductCard } from "@/components/storefront/product-card";

export function SearchClient({ products, initialQuery = "" }: { products: StorefrontProductCard[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => p.brandName.toLowerCase().includes(q) || p.genericLabel.toLowerCase().includes(q));
  }, [products, query]);

  return (
    <div className="px-4 pt-4 lg:px-0">
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-primary-tint px-3 py-2.5 lg:max-w-xl">
        <SearchIcon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={2} />
        <Input
          autoFocus
          placeholder="Search medicine, e.g. Napa"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-none bg-transparent p-0 text-[14.5px] shadow-none focus-visible:ring-0"
        />
      </div>

      {query && results.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} wide />
          ))}
        </div>
      )}

      {query && results.length === 0 && (
        <div className="py-8 text-center">
          <p className="mb-1 text-sm font-semibold text-foreground">No products found</p>
          <span className="text-xs text-muted-foreground">Try a different name or generic — or ask our pharmacist on WhatsApp.</span>
        </div>
      )}

      {!query && <p className="py-8 text-center text-sm text-muted-foreground">Start typing to search the catalog.</p>}
    </div>
  );
}
