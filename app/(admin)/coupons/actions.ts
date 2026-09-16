"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DiscountType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const CreateCouponSchema = z.object({
  code: z.string().trim().min(2, "Code must be at least 2 characters"),
  discountType: z.nativeEnum(DiscountType),
  value: z.coerce.number().positive("Value must be greater than 0"),
  minOrderAmount: z.coerce.number().min(0).optional(),
  usageLimit: z.coerce.number().int().positive().optional(),
  expiresAt: z.string().optional(),
});

export type CreateCouponResult = { success: true } | { success: false; error: string };

export async function createCouponAction(input: z.infer<typeof CreateCouponSchema>): Promise<CreateCouponResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = CreateCouponSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    assertCan(session.user, "coupons:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  const data = parsed.data;
  if (data.discountType === "PERCENTAGE" && data.value > 100) {
    return { success: false, error: "A percentage discount can't exceed 100" };
  }

  try {
    await prisma.coupon.create({
      data: {
        orgId: session.user.orgId,
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        value: data.value,
        minOrderAmount: data.minOrderAmount ?? null,
        usageLimit: data.usageLimit ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  } catch {
    return { success: false, error: "A coupon with that code already exists" };
  }

  revalidatePath("/coupons");
  return { success: true };
}

export async function toggleCouponActiveAction(couponId: string, active: boolean): Promise<CreateCouponResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };
  try {
    assertCan(session.user, "coupons:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon || coupon.orgId !== session.user.orgId) return { success: false, error: "Coupon not found" };

  await prisma.coupon.update({ where: { id: couponId }, data: { active } });
  revalidatePath("/coupons");
  return { success: true };
}
