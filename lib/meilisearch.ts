import { Meilisearch } from "meilisearch";
import { prisma } from "@/lib/prisma";

/**
 * Meilisearch only ever holds text-search fields (name, generic, category) —
 * never price or stock, which are branch-live and would go stale between
 * syncs. A search hit is just a productId; the caller re-reads price/stock
 * from Postgres the same way every other storefront listing does
 * (lib/storefront.ts's productToCard), so a slightly-stale search index can
 * never show a wrong price.
 */

export const PRODUCTS_INDEX = "products";

export interface ProductSearchDocument {
  id: string;
  slug: string | null;
  brandName: string;
  genericName: string;
  strength: string | null;
  categoryNames: string[];
}

function isConfigured(): boolean {
  return Boolean(process.env.MEILISEARCH_HOST && process.env.MEILISEARCH_API_KEY);
}

function getClient(): Meilisearch {
  if (!isConfigured()) {
    throw new Error("Meilisearch is not configured — set MEILISEARCH_HOST and MEILISEARCH_API_KEY (see .env.example).");
  }
  return new Meilisearch({ host: process.env.MEILISEARCH_HOST!, apiKey: process.env.MEILISEARCH_API_KEY! });
}

export async function ensureProductsIndex(): Promise<void> {
  const client = getClient();
  await client.createIndex(PRODUCTS_INDEX, { primaryKey: "id" }).catch(() => {});
  const index = client.index(PRODUCTS_INDEX);
  await index.updateSearchableAttributes(["brandName", "genericName", "strength"]);
  await index.updateFilterableAttributes(["categoryNames"]);
}

export async function syncProducts(productIds: string[]): Promise<void> {
  if (!isConfigured() || productIds.length === 0) return;

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { medicine: true, categories: true },
  });

  const client = getClient();
  const index = client.index(PRODUCTS_INDEX);

  const found = new Set(products.map((p) => p.id));
  const missing = productIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    await index.deleteDocuments(missing);
  }
  if (products.length === 0) return;

  const documents: ProductSearchDocument[] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    brandName: p.brandName,
    genericName: p.medicine.genericName,
    strength: p.medicine.strength,
    categoryNames: p.categories.map((c) => c.name),
  }));
  await index.addDocuments(documents);
}

export async function searchProductIds(query: string, limit = 20): Promise<string[]> {
  if (!isConfigured() || !query.trim()) return [];
  const client = getClient();
  const result = await client.index<ProductSearchDocument>(PRODUCTS_INDEX).search(query, { limit, attributesToRetrieve: ["id"] });
  return result.hits.map((hit) => hit.id);
}

export function meilisearchConfigured(): boolean {
  return isConfigured();
}
