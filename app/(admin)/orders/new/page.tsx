import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getOnlineBranchIds } from "@/lib/storefront";
import { StaffOrderForm } from "@/components/admin/staff-order-form";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

export default async function NewStaffOrderPage() {
  const session = await auth();
  assertCan(session!.user, "orders:createStaffAssisted");

  const onlineBranchIds = await getOnlineBranchIds(session!.user.orgId);
  const [products, stockRows] = await Promise.all([
    prisma.product.findMany({ include: { medicine: true }, orderBy: { brandName: "asc" } }),
    prisma.batch.groupBy({ by: ["productId"], where: { branchId: { in: onlineBranchIds }, quantity: { gt: 0 } }, _sum: { quantity: true } }),
  ]);
  const stockByProduct = new Map(stockRows.map((r) => [r.productId, r._sum.quantity ?? 0]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="New order" description="For orders taken over WhatsApp or a phone call" />
      <StaffOrderForm
        products={products.map((p) => ({
          id: p.id,
          brandName: p.brandName,
          genericLabel: `${p.medicine.genericName}${p.medicine.strength ? " " + p.medicine.strength : ""}`,
          requiresPrescription: p.medicine.requiresPrescription,
          sellsByUnit: p.sellsByUnit,
          unitLabel: p.unitLabel,
          unitPrice: p.unitPrice != null ? Number(p.unitPrice) : null,
          unitsPerPack: p.unitsPerPack,
          packLabel: p.packLabel,
          packPrice: p.packPrice != null ? Number(p.packPrice) : null,
          defaultMrp: p.defaultMrp != null ? Number(p.defaultMrp) : null,
          discountPercent: p.discountPercent != null ? Number(p.discountPercent) : null,
          stock: stockByProduct.get(p.id) ?? 0,
        }))}
      />
    </div>
  );
}
