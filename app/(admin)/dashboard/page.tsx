import Link from "next/link";

const QUICK_LINKS = [
  { href: "/pos", label: "POS" },
  { href: "/products", label: "Products" },
  { href: "/purchasing/orders", label: "Purchasing" },
  { href: "/inventory/adjustments", label: "Stock adjustments" },
  { href: "/inventory/expiry-alerts", label: "Expiry alerts" },
  { href: "/prescriptions", label: "Prescription review" },
  { href: "/orders", label: "Online orders" },
  { href: "/couriers", label: "Couriers" },
  { href: "/coupons", label: "Coupons" },
  { href: "/returns", label: "Returns" },
  { href: "/reconciliation", label: "Cash reconciliation" },
  { href: "/reports/sales", label: "Sales report" },
] as const;

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Reporting widgets are a later polish pass — these are the working sections today.</p>
      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-border bg-card px-3.5 py-3 text-sm font-semibold text-foreground hover:border-primary hover:text-primary"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
