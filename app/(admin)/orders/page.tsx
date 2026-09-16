import Link from "next/link";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-warning-tint text-warning",
  CONFIRMED: "bg-primary-tint text-primary",
  PACKAGING: "bg-primary-tint text-primary",
  PACKAGED: "bg-primary-tint text-primary",
  DELIVERING: "bg-primary-tint text-primary",
  DELIVERED: "bg-success-tint text-success",
  COMPLETED: "bg-success-tint text-success",
  CANCELED: "bg-muted text-muted-foreground",
  RETURNED: "bg-muted text-muted-foreground",
};

export default async function OrdersPage() {
  const session = await auth();
  assertCan(session!.user, "orders:manage");

  const orders = await prisma.sale.findMany({
    where: { orgId: session!.user.orgId, channel: "ONLINE" },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Online orders</h1>
        <Link href="/orders/new" className="rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark">
          + New order
        </Link>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No online orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Invoice</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-b-0 hover:bg-accent">
                  <td className="px-4 py-2.5">
                    <Link href={`/orders/${o.id}`} className="font-semibold text-primary hover:underline">
                      {o.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{o.customer?.name || o.customer?.phone || "—"}</td>
                  <td className="px-4 py-2.5 text-foreground">৳{o.total.toString()}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[o.status] ?? ""}`}>
                      {o.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-text">{o.createdAt.toLocaleDateString("en-BD")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
