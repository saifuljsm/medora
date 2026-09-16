import { redirect } from "next/navigation";
import { getOrg } from "@/lib/org";
import { getCartId, hydrateCart } from "@/lib/cart";
import { CheckoutForm } from "@/components/storefront/checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const org = await getOrg();
  const cart = await hydrateCart(org.id, getCartId());

  if (cart.lines.length === 0) redirect("/cart");
  if (cart.hasIssues) redirect("/cart");

  return (
    <div className="pt-4 lg:grid lg:grid-cols-[1.2fr_1fr] lg:gap-8 lg:px-0 lg:pt-6">
      <div>
        <h1 className="mb-3.5 text-lg font-bold text-foreground">Checkout</h1>
        <CheckoutForm requiresPrescription={cart.requiresPrescription} />
      </div>

      <div className="mt-5 lg:mt-0">
        <div className="rounded-xl border border-border bg-card p-3.5">
          <p className="mb-2.5 text-[13px] font-bold text-foreground">Order summary</p>
          <div className="flex flex-col gap-2">
            {cart.lines.map((line) => (
              <div key={`${line.productId}:${line.saleUnit}`} className="flex items-center justify-between text-[12.5px]">
                <span className="text-muted-foreground">
                  {line.brandName} <span className="text-muted-text">× {line.quantity}</span>
                </span>
                <span className="font-semibold text-foreground">৳{line.lineTotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-border pt-2.5 text-[12.5px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground">৳{cart.subtotal.toFixed(2)}</span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-text">Delivery fee and any coupon discount are applied when you place the order.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
