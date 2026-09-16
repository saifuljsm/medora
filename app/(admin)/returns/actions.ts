"use server";

import { z } from "zod";
import { RefundMethod, StockAdjustmentReason } from "@prisma/client";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { incrementBatchQuantity } from "@/lib/stock";

export interface SaleForReturn {
  saleId: string;
  invoiceNumber: string;
  branchId: string;
  items: Array<{
    saleItemId: string;
    productName: string;
    batchNumber: string;
    quantity: number;
    unitPrice: number;
    alreadyReturned: number;
  }>;
}

export async function findSaleByInvoiceNumber(invoiceNumber: string): Promise<SaleForReturn | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in" };

  const sale = await prisma.sale.findUnique({
    where: { invoiceNumber: invoiceNumber.trim() },
    include: { items: { include: { product: true, batch: true, returnItems: true } } },
  });
  if (!sale || sale.orgId !== session.user.orgId) {
    return { error: "No sale found with that invoice number" };
  }

  return {
    saleId: sale.id,
    invoiceNumber: sale.invoiceNumber!,
    branchId: sale.branchId,
    items: sale.items.map((item) => ({
      saleItemId: item.id,
      productName: item.product.brandName,
      batchNumber: item.batch.batchNumber,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      alreadyReturned: item.returnItems.reduce((sum, ri) => sum + ri.quantity, 0),
    })),
  };
}

const ReturnItemInputSchema = z.object({
  saleItemId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  restock: z.boolean(),
  writeOffReason: z.nativeEnum(StockAdjustmentReason).optional(),
});

const CreateReturnSchema = z.object({
  saleId: z.string().min(1),
  reason: z.string().min(1, "Reason is required"),
  refundMethod: z.nativeEnum(RefundMethod),
  refundAmount: z.coerce.number().min(0),
  items: z.array(ReturnItemInputSchema).min(1, "Select at least one item to return"),
});

export type CreateReturnInput = z.infer<typeof CreateReturnSchema>;

export async function createReturn(input: CreateReturnInput): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = CreateReturnSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  if (data.items.some((i) => !i.restock && !i.writeOffReason)) {
    return { success: false, error: "A write-off reason is required for items that aren't restocked" };
  }

  const sale = await prisma.sale.findUnique({ where: { id: data.saleId }, include: { items: { include: { returnItems: true } } } });
  if (!sale || sale.orgId !== session.user.orgId) {
    return { success: false, error: "Sale not found" };
  }

  // CASHIER can process every return directly, regardless of whether the
  // returned item required a prescription — the Rx gate applies only on
  // the sale side, never mirrored onto returns (build spec §8 rule 7).
  try {
    assertCan(session.user, "returns:process", { branchId: sale.branchId });
  } catch {
    return { success: false, error: "Not permitted to process returns at this branch" };
  }

  const saleItemsById = new Map(sale.items.map((si) => [si.id, si]));
  for (const item of data.items) {
    const saleItem = saleItemsById.get(item.saleItemId);
    if (!saleItem) return { success: false, error: "Item does not belong to this sale" };
    const alreadyReturned = saleItem.returnItems.reduce((sum, ri) => sum + ri.quantity, 0);
    if (item.quantity > saleItem.quantity - alreadyReturned) {
      return { success: false, error: `Cannot return more than the remaining returnable quantity for one of the items` };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const returnRecord = await tx.return.create({
        data: {
          saleId: sale.id,
          reason: data.reason,
          refundMethod: data.refundMethod,
          refundAmount: data.refundAmount,
          processedById: session.user.id,
        },
      });

      for (const item of data.items) {
        const saleItem = saleItemsById.get(item.saleItemId)!;

        await tx.returnItem.create({
          data: {
            returnId: returnRecord.id,
            saleItemId: item.saleItemId,
            productId: saleItem.productId,
            batchId: item.restock ? saleItem.batchId : null,
            quantity: item.quantity,
            restock: item.restock,
          },
        });

        if (item.restock) {
          await incrementBatchQuantity(tx, saleItem.batchId, item.quantity);
        } else {
          // The unit was already removed from Batch.quantity at the
          // original sale — not restocking means it stays removed, so we
          // do NOT decrement again here (that would double-count). This
          // StockAdjustment is purely the audit trail explaining why a
          // returned unit never went back on the shelf.
          await tx.stockAdjustment.create({
            data: {
              orgId: session.user.orgId,
              batchId: saleItem.batchId,
              quantity: -item.quantity,
              reason: item.writeOffReason!,
              note: `Non-restocked return item from sale ${sale.invoiceNumber}`,
              adjustedById: session.user.id,
            },
          });
        }
      }
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Return failed" };
  }

  return { success: true };
}
