"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { StockAdjustmentReason } from "@prisma/client";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma, TRANSACTION_TIMEOUT_MS } from "@/lib/prisma";
import { decrementBatchQuantity, InsufficientStockError } from "@/lib/stock";

const AdjustmentSchema = z.object({
  batchId: z.string().min(1, "Pick a batch"),
  quantity: z.coerce.number().int().positive("Quantity must be a positive number (the amount being written off)"),
  reason: z.nativeEnum(StockAdjustmentReason),
  note: z.string().optional(),
});

export type StockAdjustmentInput = z.infer<typeof AdjustmentSchema>;

export async function createStockAdjustment(
  input: StockAdjustmentInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = AdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const batch = await prisma.batch.findUnique({ where: { id: data.batchId } });
  if (!batch || batch.orgId !== session.user.orgId) {
    return { success: false, error: "Batch not found" };
  }

  try {
    assertCan(session.user, "stock:adjust", { branchId: batch.branchId });
  } catch {
    return { success: false, error: "Not permitted to adjust stock at this branch" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await decrementBatchQuantity(tx, batch.id, data.quantity);
      await tx.stockAdjustment.create({
        data: {
          orgId: session.user.orgId,
          batchId: batch.id,
          quantity: -data.quantity, // schema: "negative delta"
          reason: data.reason,
          note: data.note || null,
          adjustedById: session.user.id,
        },
      });
    }, { timeout: TRANSACTION_TIMEOUT_MS });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: error instanceof Error ? error.message : "Adjustment failed" };
  }

  revalidatePath("/inventory/adjustments");
  return { success: true };
}
