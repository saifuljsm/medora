import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrg } from "@/lib/org";
import { getStockByProduct, productToCard } from "@/lib/storefront";
import { ProductCard } from "@/components/storefront/product-card";

export const dynamic = "force-dynamic";

export default async function CategoryListingPage({ params }: { params: { categorySlug: string } }) {
  const org = await getOrg();
  const category = await prisma.category.findUnique({ where: { slug: params.categorySlug } });
  if (!category || category.orgId !== org.id || !category.active) notFound();

  const products = await prisma.product.findMany({
    where: { categories: { some: { id: category.id } } },
    include: { medicine: true },
  });
  const stockByProduct = await getStockByProduct(org.id, products.map((p) => p.id));
  const cards = products.map((p) => productToCard(p, stockByProduct.get(p.id) ?? 0));

  return (
    <div className="px-3 pt-4 lg:px-0">
      <div className="mb-1">
        <h1 className="mb-0.5 text-base font-bold text-foreground lg:text-2xl">{category.name}</h1>
        <span className="text-xs text-muted-foreground">{cards.length} products</span>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {cards.map((card) => (
          <ProductCard key={card.id} product={card} wide />
        ))}
        {cards.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No products in this category yet.</p>
        )}
      </div>
    </div>
  );
}
