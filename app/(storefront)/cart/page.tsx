import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrg } from "@/lib/org";
import { getCartId, hydrateCart } from "@/lib/cart";
import { CartLineRow } from "@/components/storefront/cart-line-row";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const org = await getOrg();
  const cart = await hydrateCart(org.id, getCartId());

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-0 pt-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint">
          <ShoppingCart className="h-6 w-6 text-primary" strokeWidth={2} />
        </div>
        <p className="text-sm font-semibold text-foreground">Your cart is empty</p>
        <p className="max-w-xs text-xs text-muted-foreground">Browse medicines and add them to your cart to get started.</p>
        <Button asChild className="mt-2 bg-primary text-primary-foreground hover:bg-primary-dark">
          <Link href="/">Browse medicines</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-4 lg:px-0 lg:pb-8">
      <h1 className="mb-3 text-lg font-bold text-foreground">Your cart ({cart.itemCount})</h1>

      {cart.removedCount > 0 && (
        <div className="mb-3 rounded-lg border border-warning bg-warning-tint px-3 py-2 text-xs font-semibold text-warning">
          {cart.removedCount} item{cart.removedCount > 1 ? "s" : ""} in your cart {cart.removedCount > 1 ? "are" : "is"} no longer
          available and {cart.removedCount > 1 ? "were" : "was"} removed.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card px-3.5">
        {cart.lines.map((line) => (
          <CartLineRow key={`${line.productId}:${line.saleUnit}`} line={line} />
        ))}
      </div>

      {cart.requiresPrescription && (
        <div className="my-3 rounded-lg border border-warning bg-warning-tint px-3 py-2.5 text-xs font-semibold text-warning">
          One or more items need a valid prescription — you&apos;ll upload it at checkout.
        </div>
      )}

      <div className="sticky bottom-[72px] -mx-4 mt-4 flex flex-col gap-2.5 border-t border-border bg-card p-4 lg:static lg:mx-0 lg:mt-6 lg:rounded-xl lg:border lg:pb-4 lg:pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-bold text-foreground">৳{cart.subtotal.toFixed(2)}</span>
        </div>
        <p className="text-[11px] text-muted-text">Delivery fee is calculated at checkout based on your address.</p>
        <Button
          asChild
          disabled={cart.hasIssues}
          className="h-11 w-full bg-mint text-white hover:bg-mint-dark disabled:pointer-events-none disabled:opacity-60"
        >
          <Link href={cart.hasIssues ? "#" : "/checkout"}>{cart.hasIssues ? "Fix cart issues to continue" : "Proceed to checkout"}</Link>
        </Button>
      </div>
    </div>
  );
}
