"use server";

import { z } from "zod";
import { PaymentMethod } from "@prisma/client";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { allocateFefoStock, InsufficientStockError } from "@/lib/stock";
import { resolveSaleLinePricing, computeLineVat, Decimal } from "@/lib/pricing";
import { getNextInvoiceNumber } from "@/lib/invoice";

// POS-realistic payment methods only — COD and ONLINE_GATEWAY are ecommerce
// concepts (Phase 2), not something a cashier picks at the till.
const POS_PAYMENT_METHODS = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.MOBILE_BANKING, PaymentMethod.DUE] as const;

const CartLineSchema = z.object({
  productId: z.string().min(1),
  saleUnit: z.enum(["PIECE", "PACK"]),
  quantity: z.number().int().positive(),
});

const CreatePosSaleSchema = z.object({
  branchId: z.string().min(1),
  paymentMethod: z.enum(POS_PAYMENT_METHODS),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  items: z.array(CartLineSchema).min(1, "Cart is empty"),
});

export type CreatePosSaleInput = z.infer<typeof CreatePosSaleSchema>;

export type CreatePosSaleResult =
  | { success: true; invoiceNumber: string; total: number }
  | { success: false; error: string };

// TODO(Phase 1.6): a Sale containing a SaleItem whose Medicine.requiresPrescription
// is true must not reach COMPLETED until a linked Prescription is APPROVED.
// This action currently completes every sale immediately regardless of Rx
// items — the pharmacist review gate is Phase 1.6's explicit deliverable,
// inserted into this same transaction. Until then, Rx items are flagged in
// the POS UI for staff awareness only, which is NOT sufficient enforcement
// on its own per the build spec §8 — do not treat this as done.
export async function createPosSale(input: CreatePosSaleInput): Promise<CreatePosSaleResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = CreatePosSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  try {
    assertCan(session.user, "pos:sell", { branchId: data.branchId });
  } catch {
    return { success: false, error: "Not permitted to sell at this branch" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let customerId: string | null = null;
      const phone = data.customerPhone?.trim();
      if (phone) {
        const existing = await tx.customer.findUnique({
          where: { orgId_phone: { orgId: session.user.orgId, phone } },
        });
        customerId = existing
          ? existing.id
          : (
              await tx.customer.create({
                data: { orgId: session.user.orgId, phone, name: data.customerName?.trim() || null },
              })
            ).id;
      }

      let subtotal = new Decimal(0);
      let taxAmount = new Decimal(0);
      const saleItemsData: Array<{ productId: string; batchId: string; quantity: number; unitPrice: Decimal }> = [];

      for (const line of data.items) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: line.productId } });
        const pricing = resolveSaleLinePricing({ product, saleUnit: line.saleUnit, quantity: line.quantity });

        const allocations = await allocateFefoStock(tx, {
          productId: line.productId,
          branchId: data.branchId,
          quantity: pricing.baseUnitQuantity,
        });

        for (const allocation of allocations) {
          saleItemsData.push({
            productId: line.productId,
            batchId: allocation.batchId,
            quantity: allocation.quantity,
            unitPrice: pricing.unitPrice,
          });
        }

        subtotal = subtotal.add(pricing.lineTotal);
        taxAmount = taxAmount.add(computeLineVat(pricing.lineTotal, product.vatRate));
      }

      const total = subtotal.add(taxAmount);
      const invoiceNumber = await getNextInvoiceNumber(tx, session.user.orgId, "POS");

      const sale = await tx.sale.create({
        data: {
          orgId: session.user.orgId,
          branchId: data.branchId,
          customerId,
          cashierId: session.user.id,
          channel: "POS",
          status: "COMPLETED",
          paymentMethod: data.paymentMethod,
          invoiceNumber,
          subtotal,
          discount: 0,
          taxAmount,
          deliveryFee: 0,
          total,
          items: { create: saleItemsData },
        },
      });

      return { invoiceNumber: sale.invoiceNumber!, total: total.toNumber() };
    });

    return { success: true, ...result };
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: error instanceof Error ? error.message : "Sale failed" };
  }
}
