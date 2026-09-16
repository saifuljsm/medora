import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Customer-facing, unauthenticated — reachable only by knowing the sale's
// cuid (handed back right after checkout), since there's no customer login
// yet to scope an order list to. No enumeration surface: ids aren't listed
// anywhere public and Prisma cuids aren't guessable.
export default async function OrderConfirmationPage({ params }: { params: { id: string } }) {
  const sale = await prisma.sale.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: true } },
      shippingAddress: true,
      customer: true,
    },
  });
  if (!sale || sale.channel !== "ONLINE") notFound();

  return (
    <div className="pt-6 text-center lg:mx-auto lg:max-w-lg lg:px-0">
      <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" strokeWidth={1.6} />
      <h1 className="text-lg font-bold text-foreground">Order placed</h1>
      <p className="mt-1 text-sm text-muted-foreground">Invoice {sale.invoiceNumber} · Cash on delivery</p>

      <div className="mt-5 rounded-xl border border-border bg-card p-3.5 text-left">
        <p className="mb-2.5 text-[13px] font-bold text-foreground">Items</p>
        {sale.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-1 text-[12.5px]">
            <span className="text-muted-foreground">
              {item.product.brandName} <span className="text-muted-text">× {item.quantity}</span>
            </span>
            <span className="font-semibold text-foreground">৳{Number(item.unitPrice.toString()) * item.quantity}</span>
          </div>
        ))}
        <div className="mt-2.5 flex flex-col gap-1 border-t border-border pt-2.5 text-[12.5px]">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>৳{sale.subtotal.toString()}</span>
          </div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount</span>
              <span>−৳{sale.discount.toString()}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>Delivery fee</span>
            <span>৳{sale.deliveryFee.toString()}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-foreground">
            <span>Total (pay on delivery)</span>
            <span>৳{sale.total.toString()}</span>
          </div>
        </div>
      </div>

      {sale.shippingAddress && (
        <div className="mt-3 rounded-xl border border-border bg-card p-3.5 text-left text-[12.5px] text-muted-foreground">
          <p className="mb-1 text-[13px] font-bold text-foreground">Delivering to</p>
          <p>{sale.customer?.name}</p>
          <p>
            {sale.shippingAddress.line1}
            {sale.shippingAddress.line2 ? `, ${sale.shippingAddress.line2}` : ""}
          </p>
          <p>
            {sale.shippingAddress.upazila}, {sale.shippingAddress.district}, {sale.shippingAddress.division}
          </p>
          <p>{sale.shippingAddress.phone}</p>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        We&apos;ll call you to confirm this order shortly. Save your invoice number for reference.
      </p>

      <Button asChild className="mt-4 h-11 w-full bg-primary text-primary-foreground hover:bg-primary-dark">
        <Link href="/">Continue shopping</Link>
      </Button>
    </div>
  );
}
