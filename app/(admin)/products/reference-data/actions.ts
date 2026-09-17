"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type ActionResult = { success: true } | { success: false; error: string };

async function requireCatalogManager() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  assertCan(session.user, "catalog:manage");
  return session.user;
}

const ManufacturerSchema = z.object({ name: z.string().trim().min(1, "Name is required"), country: z.string().trim().optional() });

export async function createManufacturerAction(input: z.infer<typeof ManufacturerSchema>): Promise<ActionResult> {
  await requireCatalogManager();
  const parsed = ManufacturerSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await prisma.manufacturer.create({ data: { name: parsed.data.name, country: parsed.data.country || null } });
  } catch {
    return { success: false, error: "A manufacturer with that name already exists" };
  }

  revalidatePath("/products/reference-data");
  return { success: true };
}

const CategorySchema = z.object({ name: z.string().trim().min(1, "Name is required") });

export async function createMedicineCategoryAction(input: z.infer<typeof CategorySchema>): Promise<ActionResult> {
  const user = await requireCatalogManager();
  const parsed = CategorySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    await prisma.medicineCategory.create({ data: { orgId: user.orgId, name: parsed.data.name } });
  } catch {
    return { success: false, error: "A category with that name already exists" };
  }

  revalidatePath("/products/reference-data");
  return { success: true };
}
