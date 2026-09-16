"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const SupplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type SupplierInput = z.infer<typeof SupplierSchema>;

export async function createSupplier(input: SupplierInput): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };
  assertCan(session.user, "purchasing:manage");

  const parsed = SupplierSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.supplier.create({
    data: {
      orgId: session.user.orgId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
    },
  });

  revalidatePath("/purchasing/suppliers");
  return { success: true };
}
