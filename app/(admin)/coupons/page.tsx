import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CouponForm } from "@/components/admin/coupon-form";
import { CouponToggle } from "@/components/admin/coupon-toggle";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  const session = await auth();
  assertCan(session!.user, "coupons:manage");

  const coupons = await prisma.coupon.findMany({ where: { orgId: session!.user.orgId }, orderBy: { code: "asc" } });

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-xl font-bold text-foreground">Coupons</h1>
      <p className="mt-1 text-sm text-muted-foreground">Applied at online checkout — validated and usage-counted at order time.</p>

      <div className="mt-5">
        <CouponForm />
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        {coupons.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No coupons yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Code</th>
                <th className="px-4 py-2.5 font-medium">Discount</th>
                <th className="px-4 py-2.5 font-medium">Used</th>
                <th className="px-4 py-2.5 font-medium">Expires</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5 font-semibold text-foreground">{c.code}</td>
                  <td className="px-4 py-2.5 text-foreground">
                    {c.discountType === "PERCENTAGE" ? `${c.value}%` : `৳${c.value}`}
                    {c.minOrderAmount ? ` (min ৳${c.minOrderAmount})` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-muted-text">
                    {c.timesUsed}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-muted-text">{c.expiresAt ? c.expiresAt.toLocaleDateString("en-BD") : "—"}</td>
                  <td className="px-4 py-2.5">
                    <CouponToggle couponId={c.id} active={c.active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
