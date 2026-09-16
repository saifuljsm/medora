import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PurchaseOrderForm } from "@/components/admin/purchase-order-form";

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
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-6 text-xl font-bold text-foreground">New purchase order</h1>
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
