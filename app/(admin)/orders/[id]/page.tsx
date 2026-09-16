import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { OrderActions } from "@/components/admin/order-actions";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  assertCan(session!.user, "orders:manage");

  const [order, couriers] = await Promise.all([
    prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: true } },
        customer: true,
        shippingAddress: true,
        coupon: true,
        prescriptions: true,
        delivery: { include: { courier: true } },
        paymentTransactions: true,
      },
    }),
    prisma.courier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  if (!order || order.orgId !== session!.user.orgId || order.channel !== "ONLINE") notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title={order.invoiceNumber ?? "Order"}
        description={`${order.status.replace("_", " ")} · Placed ${order.createdAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}`}
      />

      <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2.5 text-sm font-bold text-foreground">Items</p>
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1 text-sm">
                <span className="text-muted-foreground">
                  {item.product.brandName} <span className="text-muted-text">× {item.quantity}</span>
                </span>
                <span className="font-semibold text-foreground">৳{(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="mt-2.5 flex flex-col gap-1 border-t border-border pt-2.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>৳{order.subtotal.toString()}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                  <span>−৳{order.discount.toString()}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery fee</span>
                <span>৳{order.deliveryFee.toString()}</span>
              </div>
              <div className="flex justify-between font-bold text-foreground">
                <span>Total (COD)</span>
                <span>৳{order.total.toString()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 text-sm font-bold text-foreground">Customer</p>
            <p className="text-sm text-muted-foreground">{order.customer?.name}</p>
            <p className="text-sm text-muted-foreground">{order.customer?.phone}</p>
            {order.shippingAddress && (
              <p className="mt-2 text-sm text-muted-foreground">
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}, {order.shippingAddress.upazila},{" "}
                {order.shippingAddress.district}, {order.shippingAddress.division}
              </p>
            )}
          </div>

          {order.prescriptions.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-sm font-bold text-foreground">Prescription</p>
              {order.prescriptions.map((p) => (
                <a key={p.id} href={p.imageUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  View uploaded prescription →
                </a>
              ))}
            </div>
          )}

          {order.delivery && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-sm font-bold text-foreground">Delivery</p>
              <p className="text-sm text-muted-foreground">Courier: {order.delivery.courier.name}</p>
              <p className="text-sm text-muted-foreground">Status: {order.delivery.status.replace("_", " ")}</p>
              {order.delivery.trackingId && <p className="text-sm text-muted-foreground">Tracking: {order.delivery.trackingId}</p>}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-sm font-bold text-foreground">Actions</p>
          <OrderActions
            orderId={order.id}
            status={order.status}
            total={Number(order.total)}
            couriers={couriers.map((c) => ({ id: c.id, name: c.name }))}
          />
        </div>
      </div>
    </div>
  );
}
