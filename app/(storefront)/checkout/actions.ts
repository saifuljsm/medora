"use server";

import { z } from "zod";
import { PaymentMethod } from "@prisma/client";
import { prisma, TRANSACTION_TIMEOUT_MS } from "@/lib/prisma";
import { getOrg } from "@/lib/org";
import { getOnlineBranchIds } from "@/lib/storefront";
import { allocateFefoStock, InsufficientStockError } from "@/lib/stock";
import { resolveSaleLinePricing, computeLineVat, Decimal } from "@/lib/pricing";
import { getNextInvoiceNumber } from "@/lib/invoice";
import { assertPrescriptionRequirementsMet, PrescriptionRequiredError } from "@/lib/prescription-gate";
import { computeDeliveryFee } from "@/lib/delivery-fee";
import { getCartId, getCartLines, clearCart } from "@/lib/cart";
import { captureException } from "@/lib/sentry";

const CheckoutSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(6, "A valid phone number is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  division: z.string().trim().min(1, "Division is required"),
  district: z.string().trim().min(1, "District is required"),
  upazila: z.string().trim().min(1, "Upazila is required"),
  line1: z.string().trim().min(1, "Street address is required"),
  line2: z.string().trim().optional(),
  postCode: z.string().trim().optional(),
  couponCode: z.string().trim().optional(),
});

export type CheckoutInput = z.infer<typeof CheckoutSchema>;
export type CheckoutResult = { success: true; saleId: string; invoiceNumber: string; total: number } | { success: false; error: string };

export async function createOnlineSale(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = CheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const cartId = getCartId();
  const cartLines = await getCartLines(cartId);
  if (cartLines.length === 0) {
    return { success: false, error: "Your cart is empty" };
  }

  const org = await getOrg();
  const onlineBranchIds = await getOnlineBranchIds(org.id);
  const branchId = onlineBranchIds[0];
  if (!branchId) {
    return { success: false, error: "Online ordering isn't available right now" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const productIds = Array.from(new Set(cartLines.map((l) => l.productId)));

      // An online order can't supply a prescriptionId up front the way POS
      // does — the customer doesn't have one until a pharmacist approves
      // their Phase 2.11 upload — so look one up by phone before handing
      // off to the shared gate, which still does the real APPROVED /
      // not-already-attached validation.
      const requiringItems = await tx.product.findMany({
        where: { id: { in: productIds }, medicine: { requiresPrescription: true } },
        select: { id: true },
      });
      const approvedPrescription =
        requiringItems.length > 0
          ? await tx.prescription.findFirst({
              where: { orgId: org.id, status: "APPROVED", saleId: null, customer: { phone: data.phone } },
              orderBy: { reviewedAt: "desc" },
            })
          : null;

      try {
        await assertPrescriptionRequirementsMet(tx, { orgId: org.id, productIds, prescriptionId: approvedPrescription?.id });
      } catch (err) {
        if (err instanceof PrescriptionRequiredError) {
          throw new PrescriptionRequiredError(
            "This order includes a prescription-required item. Upload your prescription first and wait for pharmacist approval, then check out again.",
          );
        }
        throw err;
      }

      let customer = await tx.customer.findUnique({ where: { orgId_phone: { orgId: org.id, phone: data.phone } } });
      if (!customer) {
        customer = await tx.customer.create({
          data: { orgId: org.id, phone: data.phone, name: data.name, email: data.email || null },
        });
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

      for (const line of cartLines) {
        const product = await tx.product.findUniqueOrThrow({ where: { id: line.productId } });
        const pricing = resolveSaleLinePricing({ product, saleUnit: line.saleUnit, quantity: line.quantity });

        const allocations = await allocateFefoStock(tx, {
          productId: line.productId,
          branchId,
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

      let discount = new Decimal(0);
      let couponId: string | null = null;
      if (data.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { orgId_code: { orgId: org.id, code: data.couponCode.toUpperCase() } } });
        if (!coupon || !coupon.active) throw new Error("Invalid coupon code");
        if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error("This coupon has expired");
        if (coupon.usageLimit != null && coupon.timesUsed >= coupon.usageLimit) throw new Error("This coupon has reached its usage limit");
        if (coupon.minOrderAmount != null && subtotal.lt(coupon.minOrderAmount)) {
          throw new Error(`This coupon requires a minimum order of ৳${coupon.minOrderAmount}`);
        }
        discount = coupon.discountType === "PERCENTAGE" ? subtotal.mul(coupon.value).div(100) : Decimal.min(coupon.value, subtotal);
        couponId = coupon.id;
        await tx.coupon.update({ where: { id: coupon.id }, data: { timesUsed: { increment: 1 } } });
      }

      const deliveryFee = computeDeliveryFee(data.district);
      const total = subtotal.add(taxAmount).add(deliveryFee).sub(discount);
      const invoiceNumber = await getNextInvoiceNumber(tx, org.id, "ONLINE");

      const sale = await tx.sale.create({
        data: {
          orgId: org.id,
          branchId,
          customerId: customer.id,
          cashierId: (await tx.user.findFirstOrThrow({ where: { orgId: org.id, roles: { has: "OWNER" } } })).id,
          channel: "ONLINE",
          status: "PENDING_PAYMENT",
          paymentMethod: PaymentMethod.COD,
          orderSource: "WEBSITE",
          shippingAddressId: address.id,
          couponId,
          invoiceNumber,
          subtotal,
          discount,
          taxAmount,
          deliveryFee,
          total,
          items: { create: saleItemsData },
        },
      });

      if (approvedPrescription) {
        await tx.prescription.update({ where: { id: approvedPrescription.id }, data: { saleId: sale.id, customerId: customer.id } });
      }

      return { saleId: sale.id, invoiceNumber: sale.invoiceNumber!, total: total.toNumber() };
    }, { timeout: TRANSACTION_TIMEOUT_MS });

    if (cartId) await clearCart(cartId);
    return { success: true, ...result };
  } catch (error) {
    if (error instanceof InsufficientStockError || error instanceof PrescriptionRequiredError) {
      return { success: false, error: error.message };
    }
    if (error instanceof Error && (error.message.includes("coupon") || error.message.includes("Coupon"))) {
      return { success: false, error: error.message };
    }
    captureException(error, { flow: "createOnlineSale", phone: data.phone });
    return { success: false, error: error instanceof Error ? error.message : "Checkout failed" };
  }
}
