"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const QuickEntrySchema = z.object({
  branchId: z.string().min(1),
  productId: z.string().min(1, "Pick a product"),
  batchNumber: z.string().min(1, "Batch number is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  purchasePrice: z.coerce.number().positive("Purchase price must be positive"),
  sellingPrice: z.coerce.number().positive("Selling price must be positive"),
});

export type QuickEntryInput = z.infer<typeof QuickEntrySchema>;

export async function createQuickStockEntry(input: QuickEntryInput): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = QuickEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  try {
    assertCan(session.user, "stock:quickEntry", { branchId: data.branchId });
  } catch {
    return { success: false, error: "Not permitted to add stock at this branch" };
  }

  await prisma.batch.create({
    data: {
      orgId: session.user.orgId,
      branchId: data.branchId,
      productId: data.productId,
      batchNumber: data.batchNumber,
      expiryDate: new Date(data.expiryDate),
      quantity: data.quantity,
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      source: "QUICK_ENTRY",
    },
  });

  revalidatePath("/purchasing/quick-entry");
  return { success: true };
}
