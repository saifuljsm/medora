"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma, TRANSACTION_TIMEOUT_MS } from "@/lib/prisma";
import { incrementBatchQuantity } from "@/lib/stock";

type ActionResult = { success: true } | { success: false; error: string };

async function requireOrder(orderId: string, orgId: string) {
  const sale = await prisma.sale.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!sale || sale.orgId !== orgId || sale.channel !== "ONLINE") return null;
  return sale;
}

/** Phase 2.6 — addresses COD no-show risk: staff calls the customer to confirm before packing anything. */
export async function confirmOrderByPhone(orderId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };
  try {
    assertCan(session.user, "orders:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  const sale = await requireOrder(orderId, session.user.orgId);
  if (!sale) return { success: false, error: "Order not found" };
  if (sale.status !== "PENDING_PAYMENT") return { success: false, error: "This order has already been confirmed" };

  await prisma.sale.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { success: true };
}

const PackingSlipSchema = z.object({ orderId: z.string().min(1), codAmount: z.coerce.number().min(0) });

/**
 * Phase 2.7 — generates the packing slip and records the COD amount the
 * courier will actually collect. Pre-filled from Sale.total on the client,
 * but staff can override it (discount given at the door, partial COD,
 * etc.) — if cleared it defaults to 0, matching the schema's note that this
 * is staff-entered, never silently pulled from Sale.total.
 */
export async function generatePackingSlip(input: z.infer<typeof PackingSlipSchema>): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };
  const parsed = PackingSlipSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  try {
    assertCan(session.user, "orders:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  const sale = await requireOrder(parsed.data.orderId, session.user.orgId);
  if (!sale) return { success: false, error: "Order not found" };
  if (sale.status !== "CONFIRMED") return { success: false, error: "Order must be confirmed before packing" };

  await prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.create({
      data: { saleId: sale.id, gateway: "COD", amount: parsed.data.codAmount, status: "INITIATED" },
    });
    await tx.sale.update({ where: { id: sale.id }, data: { status: "PACKAGING" } });
  }, { timeout: TRANSACTION_TIMEOUT_MS });

  revalidatePath(`/orders/${sale.id}`);
  revalidatePath("/orders");
  return { success: true };
}

export async function markPackaged(orderId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };
  try {
    assertCan(session.user, "orders:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  const sale = await requireOrder(orderId, session.user.orgId);
  if (!sale) return { success: false, error: "Order not found" };
  if (sale.status !== "PACKAGING") return { success: false, error: "Order isn't in packing" };

  await prisma.sale.update({ where: { id: orderId }, data: { status: "PACKAGED" } });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { success: true };
}

const DispatchSchema = z.object({ orderId: z.string().min(1), courierId: z.string().min(1), trackingId: z.string().optional(), fee: z.coerce.number().min(0).default(0) });

export async function dispatchOrder(input: z.infer<typeof DispatchSchema>): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };
  const parsed = DispatchSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  try {
    assertCan(session.user, "orders:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  const sale = await requireOrder(parsed.data.orderId, session.user.orgId);
  if (!sale) return { success: false, error: "Order not found" };
  if (sale.status !== "PACKAGED") return { success: false, error: "Order must be packaged before dispatch" };

  await prisma.$transaction(async (tx) => {
    await tx.delivery.create({
      data: {
        saleId: sale.id,
        courierId: parsed.data.courierId,
        trackingId: parsed.data.trackingId || null,
        fee: parsed.data.fee,
        status: "PICKED_UP",
      },
    });
    await tx.sale.update({ where: { id: sale.id }, data: { status: "DELIVERING" } });
  }, { timeout: TRANSACTION_TIMEOUT_MS });

  revalidatePath(`/orders/${sale.id}`);
  revalidatePath("/orders");
  return { success: true };
}

/** COD is collected on delivery, so this also settles the PaymentTransaction. */
export async function markDelivered(orderId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };
  try {
    assertCan(session.user, "orders:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  const sale = await requireOrder(orderId, session.user.orgId);
  if (!sale) return { success: false, error: "Order not found" };
  if (sale.status !== "DELIVERING") return { success: false, error: "Order isn't out for delivery" };

  await prisma.$transaction(async (tx) => {
    await tx.delivery.update({ where: { saleId: sale.id }, data: { status: "DELIVERED" } });
    await tx.paymentTransaction.updateMany({ where: { saleId: sale.id, status: "INITIATED" }, data: { status: "SUCCESS" } });
    await tx.sale.update({ where: { id: sale.id }, data: { status: "DELIVERED" } });
  }, { timeout: TRANSACTION_TIMEOUT_MS });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { success: true };
}

export async function markCompleted(orderId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };
  try {
    assertCan(session.user, "orders:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  const sale = await requireOrder(orderId, session.user.orgId);
  if (!sale) return { success: false, error: "Order not found" };
  if (sale.status !== "DELIVERED") return { success: false, error: "Order hasn't been delivered yet" };

  await prisma.sale.update({ where: { id: orderId }, data: { status: "COMPLETED" } });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { success: true };
}

const CANCELABLE_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "PACKAGING", "PACKAGED"];

/**
 * Restocks every allocated batch — nothing was paid for yet on a COD order
 * that never shipped. The schema has no cancellation-reason field on Sale,
 * so there's nowhere to persist one; the UI doesn't ask for one either.
 */
export async function cancelOrder(orderId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };
  try {
    assertCan(session.user, "orders:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  const sale = await requireOrder(orderId, session.user.orgId);
  if (!sale) return { success: false, error: "Order not found" };
  if (!CANCELABLE_STATUSES.includes(sale.status)) {
    return { success: false, error: "This order can no longer be canceled" };
  }

  await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      await incrementBatchQuantity(tx, item.batchId, item.quantity);
    }
    await tx.sale.update({ where: { id: sale.id }, data: { status: "CANCELED" } });
  }, { timeout: TRANSACTION_TIMEOUT_MS });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { success: true };
}
