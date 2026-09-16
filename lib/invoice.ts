import type { SaleChannel } from "@prisma/client";
import type { TxClient } from "@/lib/stock";

/**
 * Per-org, per-channel, per-year running invoice number, row-locked inside
 * the same transaction as the Sale write. Prisma's upsert compiles to a
 * native `INSERT ... ON CONFLICT DO UPDATE` on Postgres, and the update
 * branch's `{ increment: 1 }` is an atomic `SET lastNumber = lastNumber +
 * 1` — so two simultaneous checkouts in the same org/channel/year can
 * never be handed the same number, without a separate SELECT-then-write.
 */
export async function getNextInvoiceNumber(tx: TxClient, orgId: string, channel: SaleChannel): Promise<string> {
  const year = new Date().getFullYear();

  const counter = await tx.invoiceCounter.upsert({
    where: { orgId_channel_year: { orgId, channel, year } },
    create: { orgId, channel, year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  const prefix = channel === "POS" ? "POS" : "ECOM";
  const padded = String(counter.lastNumber).padStart(6, "0");
  return `${prefix}-${year}-${padded}`;
}
