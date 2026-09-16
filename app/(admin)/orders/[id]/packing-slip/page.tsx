import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/admin/print-button";

export const dynamic = "force-dynamic";

export default async function PackingSlipPage({ params }: { params: { id: string } }) {
  const session = await auth();
  assertCan(session!.user, "orders:manage");

  const order = await prisma.sale.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: true } }, customer: true, shippingAddress: true, paymentTransactions: true },
  });
  if (!order || order.orgId !== session!.user.orgId || order.channel !== "ONLINE") notFound();

  const codTxn = order.paymentTransactions.find((t) => t.gateway === "COD");

  return (
    <div className="mx-auto max-w-xl px-6 py-8 print:px-0 print:py-0">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <div className="rounded-xl border border-border p-6 print:rounded-none print:border-0">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <p className="text-lg font-bold text-foreground">Medora</p>
            <p className="text-xs text-muted-foreground">Packing slip</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">{order.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground">{order.createdAt.toLocaleDateString("en-BD")}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase text-muted-text">Deliver to</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{order.customer?.name}</p>
          <p className="text-sm text-muted-foreground">{order.customer?.phone}</p>
          {order.shippingAddress && (
            <p className="text-sm text-muted-foreground">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}, {order.shippingAddress.upazila},{" "}
              {order.shippingAddress.district}, {order.shippingAddress.division}
              {order.shippingAddress.postCode ? ` - ${order.shippingAddress.postCode}` : ""}
            </p>
          )}
        </div>

        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-1.5 font-semibold text-foreground">Item</th>
              <th className="py-1.5 text-right font-semibold text-foreground">Qty</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-border">
                <td className="py-1.5 text-foreground">{item.product.brandName}</td>
                <td className="py-1.5 text-right text-foreground">{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-primary-tint px-4 py-3">
          <span className="text-sm font-bold text-foreground">Collect (Cash on Delivery)</span>
          <span className="text-lg font-bold text-primary">৳{codTxn ? codTxn.amount.toString() : order.total.toString()}</span>
        </div>
      </div>
    </div>
  );
}
