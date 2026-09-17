import { User, Package, FileText } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CustomerSignInForm } from "@/components/storefront/customer-sign-in-form";
import { CustomerSignOutButton } from "@/components/storefront/customer-account-panel";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  const isCustomer = session?.user?.type === "customer";

  if (!isCustomer) {
    return (
      <div className="mx-auto max-w-sm pt-10 lg:pt-6">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint">
            <User className="h-6 w-6 text-primary" strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-foreground">Sign in with your phone</p>
          <p className="max-w-xs text-xs text-muted-foreground">We&apos;ll text you a one-time code — no password needed.</p>
        </div>
        <CustomerSignInForm />
      </div>
    );
  }

  const [orders, prescriptions] = await Promise.all([
    prisma.sale.findMany({
      where: { customerId: session.user.id, channel: "ONLINE" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.prescription.findMany({
      where: { customerId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const RX_STATUS_STYLES: Record<string, string> = {
    PENDING: "bg-warning-tint text-warning",
    APPROVED: "bg-success-tint text-success",
    REJECTED: "bg-destructive-tint text-destructive",
  };

  return (
    <div className="mx-auto max-w-lg pt-6 lg:pt-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-foreground">{session.user.name || session.user.phone}</p>
          {session.user.name && <p className="text-sm text-muted-foreground">{session.user.phone}</p>}
        </div>
        <CustomerSignOutButton />
      </div>

      <h2 className="mb-2.5 text-sm font-bold text-foreground">Your orders</h2>
      {orders.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((o) => (
            <a
              key={o.id}
              href={`/order-confirmation/${o.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 hover:border-primary"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-tint">
                <Package className="h-4 w-4 text-primary" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{o.invoiceNumber}</p>
                <p className="text-xs text-muted-text">{o.status.replace("_", " ")}</p>
              </div>
              <span className="shrink-0 text-sm font-bold text-primary">৳{o.total.toString()}</span>
            </a>
          ))}
        </div>
      )}

      <h2 className="mb-2.5 mt-6 text-sm font-bold text-foreground">Your prescriptions</h2>
      {prescriptions.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No prescriptions uploaded yet.{" "}
          <a href="/prescription-order" className="font-semibold text-primary underline">
            Upload one
          </a>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {prescriptions.map((p) => (
            <a
              key={p.id}
              href={p.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 hover:border-primary"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-tint">
                <FileText className="h-4 w-4 text-primary" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Uploaded {p.createdAt.toLocaleDateString("en-BD", { dateStyle: "medium" })}
                </p>
                {p.status === "REJECTED" && <p className="text-xs text-muted-text">Contact us if you think this is a mistake.</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${RX_STATUS_STYLES[p.status]}`}>{p.status}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
