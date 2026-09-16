import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";

export function CategorySidebar({ categories }: { categories: Array<{ id: string; name: string; slug: string }> }) {
  if (categories.length === 0) return null;

  return (
    <aside className="sticky top-28 hidden h-fit w-64 shrink-0 rounded-xl border border-border bg-card py-2 lg:block">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/${cat.slug}`}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-tint text-primary">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <span className="flex-1">{cat.name}</span>
          <ChevronRight className="h-4 w-4 text-muted-text" />
        </Link>
      ))}
    </aside>
  );
}
