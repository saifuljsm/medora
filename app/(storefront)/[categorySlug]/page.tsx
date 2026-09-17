import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
    <div className="pt-3 lg:px-0 lg:pt-4">
      <nav className="mb-2.5 flex items-center gap-1 px-3 text-[11.5px] text-muted-text lg:px-0">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" strokeWidth={2} />
        <Link href="/categories" className="hover:text-foreground">
          Categories
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" strokeWidth={2} />
        <span className="truncate font-semibold text-foreground">{category.name}</span>
      </nav>

      <div className="mb-3 flex items-center justify-between px-3 lg:px-0">
        <h1 className="text-base font-bold text-foreground lg:text-2xl">Products</h1>
        <span className="text-xs text-muted-foreground">{cards.length} items</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:px-0">
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
