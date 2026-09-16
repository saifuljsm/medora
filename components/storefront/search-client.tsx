"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductCard, type StorefrontProductCard } from "@/components/storefront/product-card";
import { searchStorefrontProducts } from "@/app/(storefront)/search/actions";

const DEBOUNCE_MS = 250;

export function SearchClient({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<StorefrontProductCard[]>([]);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => setResults(await searchStorefrontProducts(q)));
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="pt-4 lg:px-0">
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

      {query && !isPending && results.length === 0 && (
        <div className="py-8 text-center">
          <p className="mb-1 text-sm font-semibold text-foreground">No products found</p>
          <span className="text-xs text-muted-foreground">Try a different name or generic — or ask our pharmacist on WhatsApp.</span>
        </div>
      )}

      {!query && <p className="py-8 text-center text-sm text-muted-foreground">Start typing to search the catalog.</p>}
    </div>
  );
}
