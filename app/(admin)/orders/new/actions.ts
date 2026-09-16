"use server";

import { z } from "zod";
import { OrderSource, PaymentMethod } from "@prisma/client";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma, TRANSACTION_TIMEOUT_MS } from "@/lib/prisma";
import { getOnlineBranchIds } from "@/lib/storefront";
import { allocateFefoStock, InsufficientStockError } from "@/lib/stock";
import { resolveSaleLinePricing, computeLineVat, Decimal } from "@/lib/pricing";
import { getNextInvoiceNumber } from "@/lib/invoice";
import { assertPrescriptionRequirementsMet, PrescriptionRequiredError } from "@/lib/prescription-gate";
import { computeDeliveryFee } from "@/lib/delivery-fee";
import { captureException } from "@/lib/sentry";

const CartLineSchema = z.object({
  productId: z.string().min(1),
  saleUnit: z.enum(["PIECE", "PACK"]),
  quantity: z.number().int().positive(),
});

const CreateStaffOrderSchema = z.object({
  orderSource: z.nativeEnum(OrderSource),
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(6, "A valid phone number is required"),
  division: z.string().trim().min(1, "Division is required"),
  district: z.string().trim().min(1, "District is required"),
  upazila: z.string().trim().min(1, "Upazila is required"),
  line1: z.string().trim().min(1, "Street address is required"),
  line2: z.string().trim().optional(),
  postCode: z.string().trim().optional(),
  prescriptionId: z.string().optional(),
  items: z.array(CartLineSchema).min(1, "Add at least one item"),
});

export type CreateStaffOrderInput = z.infer<typeof CreateStaffOrderSchema>;
export type CreateStaffOrderResult = { success: true; orderId: string; invoiceNumber: string } | { success: false; error: string };

/**
 * Phase 2.13 — staff enters an order taken over WhatsApp or a phone call.
 * Unlike self-service checkout, this order is already confirmed by
 * definition (staff talked to the customer to take it), so it skips
 * PENDING_PAYMENT and starts at CONFIRMED, ready for packing.
 */
export async function createStaffAssistedOrder(input: CreateStaffOrderInput): Promise<CreateStaffOrderResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = CreateStaffOrderSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  try {
    assertCan(session.user, "orders:createStaffAssisted");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  const onlineBranchIds = await getOnlineBranchIds(session.user.orgId);
  const branchId = onlineBranchIds[0];
  if (!branchId) return { success: false, error: "No online branch is configured" };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const productIds = Array.from(new Set(data.items.map((l) => l.productId)));

      let prescriptionId = data.prescriptionId;
      if (!prescriptionId) {
        const requiringItems = await tx.product.findMany({
          where: { id: { in: productIds }, medicine: { requiresPrescription: true } },
          select: { id: true },
        });
        if (requiringItems.length > 0) {
          const approved = await tx.prescription.findFirst({
            where: { orgId: session.user.orgId, status: "APPROVED", saleId: null, customer: { phone: data.phone } },
            orderBy: { reviewedAt: "desc" },
          });
          prescriptionId = approved?.id;
        }
      }
      await assertPrescriptionRequirementsMet(tx, { orgId: session.user.orgId, productIds, prescriptionId });

      let customer = await tx.customer.findUnique({ where: { orgId_phone: { orgId: session.user.orgId, phone: data.phone } } });
      if (!customer) {
        customer = await tx.customer.create({ data: { orgId: session.user.orgId, phone: data.phone, name: data.name } });
      } else if (!customer.name) {
        customer = await tx.customer.update({ where: { id: customer.id }, data: { name: data.name } });
      }

      const address = await tx.address.create({
        data: {
          customerId: customer.id,
          division: data.division,
          district: data.district,
          upazila: data.upazila,
          line1: data.line1,
          line2: data.line2 || null,
          postCode: data.postCode || null,
          phone: data.phone,
        },
      });

      let subtotal = new Decimal(0);
      let taxAmount = new Decimal(0);
      const saleItemsData: Array<{ productId: string; batchId: string; quantity: number; unitPrice: Decimal }> = [];

      for (const line of data.items) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: line.productId } });
        const pricing = resolveSaleLinePricing({ product, saleUnit: line.saleUnit, quantity: line.quantity });

        const allocations = await allocateFefoStock(tx, { productId: line.productId, branchId, quantity: pricing.baseUnitQuantity });
        for (const allocation of allocations) {
          saleItemsData.push({ productId: line.productId, batchId: allocation.batchId, quantity: allocation.quantity, unitPrice: pricing.unitPrice });
        }

        subtotal = subtotal.add(pricing.lineTotal);
        taxAmount = taxAmount.add(computeLineVat(pricing.lineTotal, product.vatRate));
      }

      const deliveryFee = computeDeliveryFee(data.district);
      const total = subtotal.add(taxAmount).add(deliveryFee);
      const invoiceNumber = await getNextInvoiceNumber(tx, session.user.orgId, "ONLINE");

      const sale = await tx.sale.create({
        data: {
          orgId: session.user.orgId,
          branchId,
          customerId: customer.id,
          cashierId: session.user.id,
          channel: "ONLINE",
          status: "CONFIRMED",
          paymentMethod: PaymentMethod.COD,
          orderSource: data.orderSource,
          shippingAddressId: address.id,
          invoiceNumber,
          subtotal,
          discount: 0,
          taxAmount,
          deliveryFee,
          total,
          items: { create: saleItemsData },
        },
      });

      if (prescriptionId) {
        await tx.prescription.update({ where: { id: prescriptionId }, data: { saleId: sale.id, customerId: customer.id } });
      }

      return { orderId: sale.id, invoiceNumber: sale.invoiceNumber! };
    }, { timeout: TRANSACTION_TIMEOUT_MS });

    return { success: true, ...result };
  } catch (error) {
    if (error instanceof InsufficientStockError || error instanceof PrescriptionRequiredError) {
      return { success: false, error: error.message };
    }
    captureException(error, { flow: "createStaffAssistedOrder", phone: data.phone });
    return { success: false, error: error instanceof Error ? error.message : "Order creation failed" };
  }
}
