import Link from "next/link";
import { Wallet, Package, FileCheck2, AlertTriangle, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;
  const orgId = user.orgId;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const expiryCutoff = new Date();
  expiryCutoff.setDate(expiryCutoff.getDate() + 30);

  const [todaySales, pendingOrders, pendingPrescriptions, expiringBatches] = await Promise.all([
    prisma.sale.aggregate({ where: { orgId, createdAt: { gte: startOfToday } }, _sum: { total: true }, _count: true }),
    can(user, "orders:manage")
      ? prisma.sale.count({
          where: { orgId, channel: "ONLINE", status: { in: ["PENDING_PAYMENT", "CONFIRMED", "PACKAGING", "PACKAGED", "DELIVERING"] } },
        })
      : Promise.resolve(0),
    can(user, "prescription:review") ? prisma.prescription.count({ where: { orgId, status: "PENDING" } }) : Promise.resolve(0),
    can(user, "stock:adjust")
      ? prisma.batch.count({ where: { orgId, quantity: { gt: 0 }, expiryDate: { lte: expiryCutoff } } })
      : Promise.resolve(0),
  ]);

  const recentSales = await prisma.sale.findMany({
    where: { orgId },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title={`Welcome back, ${user.name.split(" ")[0]}`} description="Here's what's happening at Medora today." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Today's sales" value={`৳${Number(todaySales._sum.total ?? 0).toFixed(0)}`} icon={Wallet} tone="primary" />
        {can(user, "orders:manage") && (
          <StatCard label="Orders in progress" value={String(pendingOrders)} icon={Package} tone="mint" href="/orders" />
        )}
        {can(user, "prescription:review") && (
          <StatCard label="Prescriptions to review" value={String(pendingPrescriptions)} icon={FileCheck2} tone="warning" href="/prescriptions" />
        )}
        {can(user, "stock:adjust") && (
          <StatCard label="Expiring within 30 days" value={String(expiringBatches)} icon={AlertTriangle} tone="destructive" href="/inventory/expiry-alerts" />
        )}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <h2 className="text-sm font-bold text-foreground">Recent sales</h2>
          <Link href="/reports/sales" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            View report <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
          </Link>
        </div>
        {recentSales.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No sales yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {recentSales.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{s.invoiceNumber}</p>
                  <p className="text-xs text-muted-text">
                    {s.channel === "POS" ? "POS" : "Online"} · {s.customer?.name || s.customer?.phone || "Walk-in"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-primary">৳{s.total.toString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
