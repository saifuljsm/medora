import Link from "next/link";
import { FileText, Phone, MessageCircle, ShieldCheck, Lock, Truck, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getOrg } from "@/lib/org";
import { getStockByProduct, productToCard } from "@/lib/storefront";
import { ProductCard } from "@/components/storefront/product-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const org = await getOrg();

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ where: { orgId: org.id, active: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { categories: { some: { orgId: org.id } } },
      include: { medicine: true, categories: true },
    }),
  ]);

  const stockByProduct = await getStockByProduct(org.id);
  const cards = products.map((p) => productToCard(p, stockByProduct.get(p.id) ?? 0));
  const cardsById = new Map(cards.map((c) => [c.id, c]));

  const carousels = categories
    .map((cat) => ({
      category: cat,
      productIds: products.filter((p) => p.categories.some((c) => c.id === cat.id)).map((p) => p.id),
    }))
    .filter((c) => c.productIds.length > 0);

  return (
    <>
      <section className="px-4 lg:px-0">
        <div className="mb-6">
          <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
            <div className="flex min-h-[118px] w-[88%] shrink-0 snap-start flex-col justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-primary-tint-strong to-primary-tint p-[18px] sm:w-[420px] lg:w-[480px]">
              <span className="text-[11.5px] font-semibold text-primary">Free delivery</span>
              <span className="max-w-[80%] text-[17px] font-bold leading-tight text-foreground">Orders above ৳500</span>
              <span className="text-[12.5px] text-muted-foreground">Nationwide, 24–48 hours</span>
            </div>
            <div className="flex min-h-[118px] w-[88%] shrink-0 snap-start flex-col justify-center gap-1.5 rounded-2xl bg-mint-tint p-[18px] sm:w-[420px] lg:w-[480px]">
              <span className="text-[11.5px] font-semibold text-mint-dark">No time to search</span>
              <span className="max-w-[80%] text-[17px] font-bold leading-tight text-foreground">Just upload your prescription</span>
              <span className="text-[12.5px] text-muted-foreground">Our pharmacist takes it from there</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground lg:text-lg">Shop by category</h2>
            <Link href="/categories" className="flex items-center gap-0.5 text-[13px] font-semibold text-primary">
              See all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/${cat.slug}`}
                className="flex min-h-11 flex-col items-center gap-[7px] rounded-xl border border-border bg-card p-[12px_6px]"
              >
                <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-primary-tint text-primary">
                  <ShieldCheck className="h-[21px] w-[21px]" strokeWidth={1.8} />
                </div>
                <span className="text-center text-[11.5px] font-medium leading-tight text-foreground">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="rounded-2xl border border-border bg-card p-[18px] lg:flex lg:items-center lg:gap-10 lg:p-8">
            <div className="lg:flex-1">
              <div className="mb-3.5 flex items-start gap-3">
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] bg-primary-tint">
                  <FileText className="h-[23px] w-[23px] text-primary" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="mb-0.5 text-[15.5px] font-bold text-foreground lg:text-lg">Order with a prescription</h3>
                  <p className="text-[12.5px] leading-snug text-muted-foreground lg:text-sm">
                    Upload a photo — our pharmacist reads it and confirms your order by phone.
                  </p>
                </div>
              </div>
              <Link
                href="/prescription-order"
                className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-mint px-[13px] py-[13px] text-[14.5px] font-semibold text-white lg:w-auto lg:px-8"
              >
                Upload prescription
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-5 lg:mt-0 lg:flex-1 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              {[
                "Take a clear photo of your prescription",
                "Upload it here — no account needed",
                "Our pharmacist reviews it",
                "We call to confirm before dispatch",
              ].map((step, i) => (
                <div key={step} className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-[11.5px] leading-snug text-muted-foreground lg:text-xs">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2.5 sm:max-w-md lg:max-w-none lg:grid-cols-2">
          <a href="tel:09642000000" className="flex min-h-11 flex-col gap-2 rounded-xl border border-border bg-card p-[14px_12px]">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-primary-tint">
              <Phone className="h-4 w-4 text-primary" strokeWidth={2} />
            </div>
            <p className="text-[12.5px] font-semibold text-foreground">Call to order</p>
            <span className="text-[11px] text-muted-foreground">09642-XXXXXX</span>
          </a>
          <a
            href="https://wa.me/8809642000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 flex-col gap-2 rounded-xl border border-border bg-card p-[14px_12px]"
          >
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-mint-tint">
              <MessageCircle className="h-4 w-4 text-mint-dark" strokeWidth={2} />
            </div>
            <p className="text-[12.5px] font-semibold text-foreground">WhatsApp support</p>
            <span className="text-[11px] text-muted-foreground">Replies in minutes</span>
          </a>
        </div>

        {carousels.map(({ category, productIds }) => (
          <div key={category.id} className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">{category.name}</h2>
              <Link href={`/${category.slug}`} className="flex items-center gap-0.5 text-[13px] font-semibold text-primary">
                See all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
              {productIds
                .map((id) => cardsById.get(id))
                .filter((c): c is NonNullable<typeof c> => !!c)
                .slice(0, 6)
                .map((card) => (
                  <ProductCard key={card.id} product={card} />
                ))}
            </div>
          </div>
        ))}

        <div className="mb-6 rounded-2xl bg-primary-tint p-[18px_16px]">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <div className="flex items-start gap-[9px]">
              <ShieldCheck className="mt-0.5 h-[19px] w-[19px] shrink-0 text-primary" strokeWidth={1.8} />
              <div>
                <p className="text-xs font-semibold leading-snug text-foreground">100% genuine products</p>
                <span className="text-[10.5px] text-muted-foreground">Sourced from licensed distributors</span>
              </div>
            </div>
            <div className="flex items-start gap-[9px]">
              <FileText className="mt-0.5 h-[19px] w-[19px] shrink-0 text-primary" strokeWidth={1.8} />
              <div>
                <p className="text-xs font-semibold leading-snug text-foreground">Licensed pharmacist support</p>
                <span className="text-[10.5px] text-muted-foreground">Every order reviewed</span>
              </div>
            </div>
            <div className="flex items-start gap-[9px]">
              <Lock className="mt-0.5 h-[19px] w-[19px] shrink-0 text-primary" strokeWidth={1.8} />
              <div>
                <p className="text-xs font-semibold leading-snug text-foreground">Secure payments</p>
                <span className="text-[10.5px] text-muted-foreground">COD, with more options soon</span>
              </div>
            </div>
            <div className="flex items-start gap-[9px]">
              <Truck className="mt-0.5 h-[19px] w-[19px] shrink-0 text-primary" strokeWidth={1.8} />
              <div>
                <p className="text-xs font-semibold leading-snug text-foreground">Nationwide delivery</p>
                <span className="text-[10.5px] text-muted-foreground">Across Bangladesh</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
