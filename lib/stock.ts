import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * The ONE place Batch.quantity ever changes. Every caller — Sale (POS +
 * checkout), StockTransfer, StockAdjustment, Receiving, Returns — goes
 * through here so two simultaneous writers can never oversell the same
 * batch.
 *
 * Concurrency approach: rather than SELECT ... FOR UPDATE + read-modify-
 * write in JS, decrementBatchQuantity issues a single guarded UPDATE
 * (`SET quantity = quantity - $1 WHERE id = $2 AND quantity >= $1`) via
 * Prisma's atomic `decrement` combined with an `updateMany` filter. That
 * statement is atomic in Postgres — concurrent writers to the same row
 * serialize on the row's write lock automatically, and the WHERE guard
 * means an update that would drive quantity negative simply matches zero
 * rows instead of racing past a check. Callers MUST run these inside a
 * `prisma.$transaction` alongside whatever else the operation writes
 * (SaleItem, StockAdjustment, etc.) so the whole operation is atomic.
 */

export type TxClient = Prisma.TransactionClient | PrismaClient;

export class InsufficientStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientStockError";
  }
}

export async function incrementBatchQuantity(tx: TxClient, batchId: string, amount: number): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`incrementBatchQuantity: amount must be a positive integer, got ${amount}`);
  }
  await tx.batch.update({
    where: { id: batchId },
    data: { quantity: { increment: amount } },
  });
}

/**
 * Atomically decrements a single batch, guarded against going negative.
 * Throws InsufficientStockError if the batch doesn't have `amount`
 * available at the moment the UPDATE runs (including races lost to a
 * concurrent decrement).
 */
export async function decrementBatchQuantity(tx: TxClient, batchId: string, amount: number): Promise<void> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`decrementBatchQuantity: amount must be a positive integer, got ${amount}`);
  }
  const { count } = await tx.batch.updateMany({
    where: { id: batchId, quantity: { gte: amount } },
    data: { quantity: { decrement: amount } },
  });
  if (count === 0) {
    const batch = await tx.batch.findUnique({ where: { id: batchId }, select: { quantity: true } });
    throw new InsufficientStockError(
      `Insufficient stock on batch ${batchId}: requested ${amount}, available ${batch?.quantity ?? 0}`,
    );
  }
}

/** Same as decrementBatchQuantity but reports success instead of throwing — used by allocateFefoStock's retry loop. */
async function tryDecrementBatchQuantity(tx: TxClient, batchId: string, amount: number): Promise<boolean> {
  const { count } = await tx.batch.updateMany({
    where: { id: batchId, quantity: { gte: amount } },
    data: { quantity: { decrement: amount } },
  });
  return count > 0;
}

export interface StockAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
}

/**
 * FEFO (first-expiry-first-out) allocation + decrement for a POS sale or
 * online checkout line: picks the soonest-expiring batch(es) with stock at
 * this branch for this product, splitting across batches if one isn't
 * enough, and decrements each as it allocates.
 *
 * Re-queries the soonest-expiring candidate on every iteration (rather
 * than planning against a single upfront read) so a batch that another
 * concurrent sale just emptied is simply skipped on retry, instead of
 * causing a stale allocation.
 */
export async function allocateFefoStock(
  tx: TxClient,
  params: { productId: string; branchId: string; quantity: number },
): Promise<StockAllocation[]> {
  const { productId, branchId } = params;
  let remaining = params.quantity;
  if (!Number.isInteger(remaining) || remaining <= 0) {
    throw new Error(`allocateFefoStock: quantity must be a positive integer, got ${remaining}`);
  }

  const allocations: StockAllocation[] = [];
  // Bound the retry loop so a pathological, never-terminating race (or a
  // logic bug) fails loudly instead of hanging the request.
  const MAX_ITERATIONS = 1000;

  for (let i = 0; i < MAX_ITERATIONS && remaining > 0; i++) {
    const candidate = await tx.batch.findFirst({
      where: { productId, branchId, quantity: { gt: 0 } },
      orderBy: { expiryDate: "asc" },
    });

    if (!candidate) {
      throw new InsufficientStockError(
        `Insufficient stock for product ${productId} at branch ${branchId}: requested ${params.quantity}, ` +
          `${remaining} short after allocating from all available batches`,
      );
    }

    const takeQty = Math.min(candidate.quantity, remaining);
    const ok = await tryDecrementBatchQuantity(tx, candidate.id, takeQty);
    if (!ok) {
      // Lost a race against a concurrent sale between the read above and
      // this decrement — don't exclude the batch, just retry: the next
      // findFirst sees its current (lower, possibly zero) quantity and
      // either takes a smaller amount or naturally moves to the next batch.
      continue;
    }

    allocations.push({
      batchId: candidate.id,
      batchNumber: candidate.batchNumber,
      expiryDate: candidate.expiryDate,
      quantity: takeQty,
    });
    remaining -= takeQty;
  }

  if (remaining > 0) {
    throw new InsufficientStockError(
      `Could not allocate stock for product ${productId} at branch ${branchId} after ${MAX_ITERATIONS} attempts ` +
        `(${remaining} still short) — likely heavy concurrent contention on the same batches.`,
    );
  }

  return allocations;
}
