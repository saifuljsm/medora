"use server";

import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { syncProducts } from "@/lib/meilisearch";
import {
  parseWorkbookBuffer,
  validateImportRows,
  ProductImportRowSchema,
  type ParsedImportRow,
  type ProductImportRow,
} from "@/lib/product-import";

async function requireCatalogManager() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  assertCan(session.user, "catalog:manage");
  return session.user;
}

export async function parseProductImportFile(formData: FormData): Promise<{ rows: ParsedImportRow[] }> {
  await requireCatalogManager();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file uploaded");

  const buffer = Buffer.from(await file.arrayBuffer());
  const rawRows = await parseWorkbookBuffer(buffer, file.name);
  return { rows: validateImportRows(rawRows) };
}

export interface CommitImportResult {
  created: number;
  updated: number;
  failed: Array<{ rowNumber?: number; brandName?: string; reason: string }>;
}

export async function commitProductImport(
  rows: Array<{ rowNumber: number; data: ProductImportRow }>,
): Promise<CommitImportResult> {
  await requireCatalogManager();

  const result: CommitImportResult = { created: 0, updated: 0, failed: [] };
  const syncedProductIds: string[] = [];

  for (const { rowNumber, data: rawData } of rows) {
    // Defense in depth: never trust "already validated" data handed back
    // from the client — re-validate before writing.
    const parsed = ProductImportRowSchema.safeParse(rawData);
    if (!parsed.success) {
      result.failed.push({
        rowNumber,
        reason: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
      continue;
    }
    const row = parsed.data;

    try {
      const manufacturer = row.manufacturer
        ? await prisma.manufacturer.upsert({
            where: { name: row.manufacturer },
            update: {},
            create: { name: row.manufacturer },
          })
        : null;

      let medicine = await prisma.medicine.findFirst({
        where: {
          genericName: { equals: row.genericName, mode: "insensitive" },
          form: { equals: row.form, mode: "insensitive" },
          strength: row.strength ?? null,
          manufacturerId: manufacturer?.id ?? null,
        },
      });
      if (!medicine) {
        medicine = await prisma.medicine.create({
          data: {
            genericName: row.genericName,
            form: row.form,
            strength: row.strength,
            category: row.category,
            requiresPrescription: row.requiresPrescription,
            manufacturerId: manufacturer?.id,
          },
        });
      }

      const productData = {
        medicineId: medicine.id,
        brandName: row.brandName,
        packSize: row.packSize,
        barcode: row.barcode,
        defaultMrp: row.defaultMrp,
        sellsByUnit: row.sellsByUnit,
        unitLabel: row.unitLabel,
        unitPrice: row.unitPrice,
        unitsPerPack: row.unitsPerPack,
        packLabel: row.packLabel,
        packPrice: row.packPrice,
        vatRate: row.vatRate,
      };

      const existingProduct = row.barcode
        ? await prisma.product.findUnique({ where: { barcode: row.barcode } })
        : null;

      if (existingProduct) {
        await prisma.product.update({ where: { id: existingProduct.id }, data: productData });
        result.updated++;
        syncedProductIds.push(existingProduct.id);
      } else {
        const created = await prisma.product.create({ data: productData });
        result.created++;
        syncedProductIds.push(created.id);
      }
    } catch (error) {
      result.failed.push({
        rowNumber,
        brandName: row.brandName,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (syncedProductIds.length > 0) {
    await syncProducts(syncedProductIds);
  }

  return result;
}
