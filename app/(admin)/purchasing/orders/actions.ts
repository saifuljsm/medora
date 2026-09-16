"use server";

import { z } from "zod";
import { PurchaseUnit } from "@prisma/client";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const PurchaseOrderItemSchema = z.object({
  productId: z.string().min(1),
  unit: z.nativeEnum(PurchaseUnit),
  quantity: z.number().int().positive(),
  unitCost: z.number().positive(),
});

const CreatePurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  branchId: z.string().min(1, "Branch is required"),
  items: z.array(PurchaseOrderItemSchema).min(1, "Add at least one item"),
});

export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>;

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = CreatePurchaseOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  assertCan(session.user, "purchasing:manage", { branchId: parsed.data.branchId });

  const order = await prisma.purchaseOrder.create({
    data: {
      orgId: session.user.orgId,
      branchId: parsed.data.branchId,
      supplierId: parsed.data.supplierId,
      status: "ORDERED",
      items: {
        create: parsed.data.items.map((item) => ({
          productId: item.productId,
          unit: item.unit,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      },
    },
  });

  return { success: true, id: order.id };
}
