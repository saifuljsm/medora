import { ShoppingCart } from "lucide-react";

// TODO(Phase 2.4): Redis-backed cart. Placeholder for now so the bottom
// nav's Cart tab doesn't 404 while the storefront (2.3) is being built.
export default function CartPage() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 pt-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint">
        <ShoppingCart className="h-6 w-6 text-primary" strokeWidth={2} />
      </div>
      <p className="text-sm font-semibold text-foreground">Cart coming very soon</p>
      <p className="max-w-xs text-xs text-muted-foreground">This is next in the build order.</p>
    </div>
  );
}
