import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PosTerminal } from "@/components/admin/pos-terminal";

export default async function PosPage() {
  const session = await auth();
  if (!session?.user) return null;

  // CASHIER always sells at their own assigned branch; OWNER (the only
  // other role with pos:sell) falls back to the org's first branch when
  // they have none assigned.
  const branch = session.user.branchId
    ? await prisma.branch.findUnique({ where: { id: session.user.branchId } })
    : await prisma.branch.findFirst({ where: { orgId: session.user.orgId }, orderBy: { createdAt: "asc" } });

  if (!branch) redirect("/dashboard");

  try {
    assertCan(session.user, "pos:sell", { branchId: branch.id });
  } catch {
    redirect("/dashboard");
  }

  const [products, stockRows] = await Promise.all([
    prisma.product.findMany({
      include: { medicine: true },
      orderBy: { brandName: "asc" },
    }),
    prisma.batch.groupBy({
      by: ["productId"],
      where: { branchId: branch.id, quantity: { gt: 0 } },
      _sum: { quantity: true },
    }),
  ]);

  const stockByProduct = new Map(stockRows.map((row) => [row.productId, row._sum.quantity ?? 0]));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">POS — {branch.name}</h1>
      </div>
      <PosTerminal
        branchId={branch.id}
        products={products.map((p) => ({
          id: p.id,
          brandName: p.brandName,
          genericLabel: `${p.medicine.genericName}${p.medicine.strength ? " " + p.medicine.strength : ""}`,
          barcode: p.barcode,
          requiresPrescription: p.medicine.requiresPrescription,
          sellsByUnit: p.sellsByUnit,
          unitLabel: p.unitLabel,
          unitPrice: p.unitPrice != null ? Number(p.unitPrice) : null,
          unitsPerPack: p.unitsPerPack,
          packLabel: p.packLabel,
          packPrice: p.packPrice != null ? Number(p.packPrice) : null,
          defaultMrp: p.defaultMrp != null ? Number(p.defaultMrp) : null,
          vatRate: p.vatRate != null ? Number(p.vatRate) : null,
          stock: stockByProduct.get(p.id) ?? 0,
        }))}
      />
    </div>
  );
}
