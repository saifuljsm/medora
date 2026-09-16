import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PurchaseOrderForm } from "@/components/admin/purchase-order-form";
import { PageHeader } from "@/components/admin/page-header";

export default async function NewPurchaseOrderPage() {
  const session = await auth();
  if (!session?.user) return null;
  assertCan(session.user, "purchasing:manage");

  const [suppliers, branches, products] = await Promise.all([
    prisma.supplier.findMany({ where: { orgId: session.user.orgId }, orderBy: { name: "asc" } }),
    prisma.branch.findMany({ where: { orgId: session.user.orgId }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      include: { medicine: true },
      orderBy: { brandName: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="New purchase order" />
      <PurchaseOrderForm
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        products={products.map((p) => ({
          id: p.id,
          label: `${p.brandName} — ${p.medicine.genericName}${p.medicine.strength ? " " + p.medicine.strength : ""}`,
          unitsPerPack: p.unitsPerPack,
          unitLabel: p.unitLabel,
          packLabel: p.packLabel,
        }))}
      />
    </div>
  );
}
