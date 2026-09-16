"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@/lib/pricing";

const ReconcileSchema = z.object({
  branchId: z.string().min(1),
  date: z.string().min(1), // yyyy-mm-dd
  openingFloat: z.coerce.number().min(0),
  countedCash: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export type ReconcileInput = z.infer<typeof ReconcileSchema>;

export async function reconcileCash(input: ReconcileInput): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = ReconcileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  try {
    assertCan(session.user, "reconciliation:manage", { branchId: data.branchId });
  } catch {
    return { success: false, error: "Not permitted to reconcile this branch" };
  }

  const day = new Date(data.date);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const cashSales = await prisma.sale.aggregate({
    where: { orgId: session.user.orgId, branchId: data.branchId, paymentMethod: "CASH", createdAt: { gte: dayStart, lte: dayEnd } },
    _sum: { total: true },
  });

  const expectedCash = new Decimal(cashSales._sum.total ?? 0);
  const countedCash = new Decimal(data.countedCash);
  const variance = countedCash.sub(expectedCash);

  await prisma.cashReconciliation.upsert({
    where: { orgId_branchId_date: { orgId: session.user.orgId, branchId: data.branchId, date: dayStart } },
    update: {
      openingFloat: data.openingFloat,
      expectedCash,
      countedCash,
      variance,
      reconciledById: session.user.id,
      notes: data.notes || null,
    },
    create: {
      orgId: session.user.orgId,
      branchId: data.branchId,
      date: dayStart,
      openingFloat: data.openingFloat,
      expectedCash,
      countedCash,
      variance,
      reconciledById: session.user.id,
      notes: data.notes || null,
    },
  });

  revalidatePath("/reconciliation");
  return { success: true };
}
