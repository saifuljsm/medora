import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CourierForm } from "@/components/admin/courier-form";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

export default async function CouriersPage() {
  const session = await auth();
  assertCan(session!.user, "orders:manage");

  const couriers = await prisma.courier.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="Couriers" description="Manual dispatch only for now — assign one when you mark an order out for delivery." />

      <div className="mb-5">
        <CourierForm />
      </div>

      <div className="rounded-xl border border-border bg-card px-4">
        {couriers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No couriers yet — add one above.</p>
        ) : (
          couriers.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-b-0">
              <span className="font-medium text-foreground">{c.name}</span>
              <span className={`text-xs ${c.active ? "text-success" : "text-muted-text"}`}>{c.active ? "Active" : "Inactive"}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
