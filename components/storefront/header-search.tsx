"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Pill } from "lucide-react";
import { searchStorefrontProducts } from "@/app/(storefront)/search/actions";
import type { StorefrontProductCard } from "@/components/storefront/product-card";

const DEBOUNCE_MS = 250;

/**
 * Lives in the header, in the same place on every page — typing shows a
 * results dropdown right below it. Deliberately does NOT navigate away on
 * click/focus: an earlier version linked to a separate /search page whose
 * own search bar sat in a different spot, which felt like the bar itself
 * had jumped somewhere else. Clicking an actual result still navigates,
 * since that's an explicit choice, not a surprise relocation.
 *
 * Queries the server (Meilisearch when configured, Postgres ILIKE
 * otherwise) rather than filtering a client-side copy of the whole
 * catalog — that stopped scaling past a handful of demo products.
 */
export function HeaderSearch({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<StorefrontProductCard[]>([]);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const hits = await searchStorefrontProducts(q);
        setResults(hits.slice(0, 8));
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${compact ? "" : "max-w-xl flex-1"}`}>
      <div className="flex items-center rounded-xl bg-primary-tint py-1 pl-4 pr-1">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search medicine, e.g. Napa"
          className={`flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-text ${compact ? "text-[14.5px]" : "text-sm"}`}
        />
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mint">
          <Search className="h-4 w-4 text-white" strokeWidth={2.5} />
        </span>
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {results.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">{isPending ? "Searching…" : "No products found"}</p>
          ) : (
            <>
              {results.map((p) => (
                <Link
                  key={p.id}
                  href={p.slug ? `/medicines/${p.slug}` : "#"}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 border-b border-border p-3 last:border-b-0 hover:bg-accent"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-tint">
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <Pill className="h-5 w-5 text-primary" strokeWidth={1.6} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{p.brandName}</p>
                    <p className="truncate text-xs text-muted-text">{p.genericLabel}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-primary">৳{p.price.toFixed(2)}</span>
                </Link>
              ))}
              <Link
                href={`/search?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setOpen(false)}
                className="block p-3 text-center text-sm font-semibold text-primary hover:bg-accent"
              >
                See all results
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
