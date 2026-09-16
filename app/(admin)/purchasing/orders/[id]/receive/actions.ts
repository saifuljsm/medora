"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma, TRANSACTION_TIMEOUT_MS } from "@/lib/prisma";
import { convertPurchaseLineToBaseUnits } from "@/lib/pricing";

const ReceiveLineSchema = z.object({
  purchaseOrderItemId: z.string().min(1),
  batchNumber: z.string().min(1, "Batch number is required"),
  expiryDate: z.string().min(1, "Expiry date is required"), // yyyy-mm-dd
  receivedQuantity: z.coerce.number().int().positive("Received quantity must be positive"),
  sellingPrice: z.coerce.number().positive("Selling price must be positive"),
});

const ReceivePurchaseOrderSchema = z.object({
  purchaseOrderId: z.string().min(1),
  lines: z.array(ReceiveLineSchema).min(1, "Select at least one line to receive"),
});

export type ReceivePurchaseOrderInput = z.infer<typeof ReceivePurchaseOrderSchema>;

export async function receivePurchaseOrder(
  input: ReceivePurchaseOrderInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = ReceivePurchaseOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { purchaseOrderId, lines } = parsed.data;

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: { items: true },
  });
  if (!order || order.orgId !== session.user.orgId) {
    return { success: false, error: "Purchase order not found" };
  }
  assertCan(session.user, "purchasing:receive", { branchId: order.branchId });

  if (order.status === "RECEIVED" || order.status === "CANCELED") {
    return { success: false, error: `This order is already ${order.status.toLowerCase()}` };
  }

  const itemsById = new Map(order.items.map((item) => [item.id, item]));

  try {
    await prisma.$transaction(async (tx) => {
      let shortfallThisSubmission = false;

      for (const line of lines) {
        const item = itemsById.get(line.purchaseOrderItemId);
        if (!item || item.purchaseOrderId !== purchaseOrderId) {
          throw new Error("Line does not belong to this purchase order");
        }
        if (item.batchId) {
          throw new Error(`Line for product ${item.productId} was already received`);
        }
        if (line.receivedQuantity > item.quantity) {
          throw new Error(`Received quantity (${line.receivedQuantity}) exceeds ordered quantity (${item.quantity})`);
        }
        if (line.receivedQuantity < item.quantity) {
          shortfallThisSubmission = true;
        }

        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        const { baseUnitQuantity, baseUnitCost } = convertPurchaseLineToBaseUnits({
          unit: item.unit,
          quantity: line.receivedQuantity,
          unitCost: item.unitCost,
          unitsPerPack: product.unitsPerPack,
        });

        const batch = await tx.batch.create({
          data: {
            orgId: order.orgId,
            branchId: order.branchId,
            productId: item.productId,
            batchNumber: line.batchNumber,
            expiryDate: new Date(line.expiryDate),
            quantity: baseUnitQuantity,
            purchasePrice: baseUnitCost,
            sellingPrice: line.sellingPrice,
            source: "PURCHASE_ORDER",
          },
        });

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { batchId: batch.id },
        });
      }

      const allItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId } });
      const allReceived = allItems.every((item) => item.batchId !== null);

      // PARTIALLY_RECEIVED is sticky: once any line has ever come up short,
      // the order stays PARTIALLY_RECEIVED even after every remaining line
      // is eventually received in full — there's no backorder tracking on
      // PurchaseOrderItem, so a short line's shortfall is never revisited.
      const wasAlreadyPartial = order.status === "PARTIALLY_RECEIVED";
      const newStatus =
        shortfallThisSubmission || wasAlreadyPartial
          ? "PARTIALLY_RECEIVED"
          : allReceived
            ? "RECEIVED"
            : "ORDERED";

      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          status: newStatus,
          receivedAt: newStatus === "RECEIVED" || newStatus === "PARTIALLY_RECEIVED" ? new Date() : order.receivedAt,
        },
      });
    }, { timeout: TRANSACTION_TIMEOUT_MS });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to receive purchase order" };
  }

  revalidatePath(`/purchasing/orders/${purchaseOrderId}/receive`);
  revalidatePath("/purchasing/orders");
  return { success: true };
}
