import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ReceivePurchaseOrderForm } from "@/components/admin/receive-purchase-order-form";

export default async function ReceivePurchaseOrderPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return null;

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      supplier: true,
      branch: true,
      items: {
        include: { product: { include: { medicine: true } }, batch: true },
      },
    },
  });
  if (!order || order.orgId !== session.user.orgId) notFound();

  assertCan(session.user, "purchasing:receive", { branchId: order.branchId });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Receive purchase order</h1>
          <p className="text-sm text-muted-foreground">
            {order.supplier.name} · {order.branch.name}
          </p>
        </div>
        <Badge>{order.status}</Badge>
      </div>

      <ReceivePurchaseOrderForm
        purchaseOrderId={order.id}
        disabled={order.status === "RECEIVED" || order.status === "CANCELED"}
        items={order.items.map((item) => ({
          id: item.id,
          productLabel: `${item.product.brandName} — ${item.product.medicine.genericName}`,
          unit: item.unit,
          unitLabel: item.unit === "PIECE" ? item.product.unitLabel || "piece" : item.product.packLabel || "pack",
          unitsPerPack: item.product.unitsPerPack,
          orderedQuantity: item.quantity,
          unitCost: Number(item.unitCost),
          alreadyReceived: item.batchId !== null,
          receivedBatchNumber: item.batch?.batchNumber ?? null,
          receivedBaseUnits: item.batch?.quantity ?? null,
          suggestedSellingPrice: item.product.defaultMrp != null ? Number(item.product.defaultMrp) : null,
        }))}
      />
    </div>
  );
}
