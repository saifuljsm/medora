import { prisma } from "@/lib/prisma";
import { getOrg } from "@/lib/org";
import { getStockByProduct, productToCard } from "@/lib/storefront";
import { SearchClient } from "@/components/storefront/search-client";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const org = await getOrg();
  const products = await prisma.product.findMany({ include: { medicine: true } });
  const stockByProduct = await getStockByProduct(org.id);
  const cards = products.map((p) => productToCard(p, stockByProduct.get(p.id) ?? 0));

  return <SearchClient products={cards} initialQuery={searchParams.q ?? ""} />;
}
