"use server";

import { prisma } from "@/lib/prisma";
import { getOrg } from "@/lib/org";
import { getStockByProduct, productToCard } from "@/lib/storefront";
import { meilisearchConfigured, searchProductIds } from "@/lib/meilisearch";
import type { StorefrontProductCard } from "@/components/storefront/product-card";

const RESULT_LIMIT = 20;

/**
 * Uses real (typo-tolerant) Meilisearch when configured; falls back to a
 * plain Postgres ILIKE match otherwise so search still works without that
 * infrastructure. Either way, price/stock are always read live from
 * Postgres afterward — the index only ever holds text fields.
 */
export async function searchStorefrontProducts(query: string): Promise<StorefrontProductCard[]> {
  const q = query.trim();
  if (!q) return [];

  const org = await getOrg();

  const productIds = meilisearchConfigured()
    ? await searchProductIds(q, RESULT_LIMIT)
    : (
        await prisma.product.findMany({
          where: {
            OR: [{ brandName: { contains: q, mode: "insensitive" } }, { medicine: { genericName: { contains: q, mode: "insensitive" } } }],
          },
          select: { id: true },
          take: RESULT_LIMIT,
        })
      ).map((p) => p.id);

  if (productIds.length === 0) return [];

  const [products, stockByProduct] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds } }, include: { medicine: true } }),
    getStockByProduct(org.id, productIds),
  ]);

  const productById = new Map(products.map((p) => [p.id, p]));
  // Preserve the search engine's relevance ordering, not the DB's.
  return productIds
    .map((id) => productById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => productToCard(p, stockByProduct.get(p.id) ?? 0));
}
