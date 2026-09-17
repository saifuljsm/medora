"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { syncProducts } from "@/lib/meilisearch";

const UpdateProductSchema = z.object({
  id: z.string().min(1),
  brandName: z.string().min(1, "Brand name is required"),
  packSize: z.string().optional(),
  barcode: z.string().optional(),
  defaultMrp: z.coerce.number().positive().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  vatRate: z.coerce.number().min(0).max(100).optional(),
  sellsByUnit: z.boolean(),
  unitLabel: z.string().optional(),
  unitPrice: z.coerce.number().positive().optional(),
  unitsPerPack: z.coerce.number().int().positive().optional(),
  packLabel: z.string().optional(),
  packPrice: z.coerce.number().positive().optional(),
  slug: z.string().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string()),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function updateProduct(input: UpdateProductInput): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  try {
    assertCan(session.user, "catalog:manage");
  } catch {
    return { success: false, error: "Not permitted to edit products" };
  }

  const parsed = UpdateProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  if (data.sellsByUnit && (!data.unitsPerPack || data.unitsPerPack <= 0)) {
    return { success: false, error: "unitsPerPack is required when the product sells by unit" };
  }

  const slug = data.slug?.trim() ? slugify(data.slug) : undefined;

  try {
    await prisma.product.update({
      where: { id: data.id },
      data: {
        brandName: data.brandName,
        packSize: data.packSize || null,
        barcode: data.barcode || null,
        defaultMrp: data.defaultMrp ?? null,
        discountPercent: data.discountPercent ?? null,
        vatRate: data.vatRate ?? null,
        sellsByUnit: data.sellsByUnit,
        unitLabel: data.unitLabel || null,
        unitPrice: data.unitPrice ?? null,
        unitsPerPack: data.unitsPerPack ?? null,
        packLabel: data.packLabel || null,
        packPrice: data.packPrice ?? null,
        slug: slug || null,
        shortDescription: data.shortDescription || null,
        description: data.description || null,
        images: data.images,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = (error.meta?.target as string[] | undefined)?.join(", ") ?? "field";
      return { success: false, error: `That ${target} is already in use by another product.` };
    }
    return { success: false, error: error instanceof Error ? error.message : "Update failed" };
  }

  await syncProducts([data.id]);

  revalidatePath(`/products/${data.id}/edit`);
  revalidatePath("/products");
  return { success: true };
}
