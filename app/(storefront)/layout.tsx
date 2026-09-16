import { Topbar } from "@/components/storefront/topbar";
import { BottomNav } from "@/components/storefront/bottom-nav";
import { CategorySidebar } from "@/components/storefront/category-sidebar";
import { Footer } from "@/components/storefront/footer";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrg } from "@/lib/org";
import { getCartId, getCartItemCount } from "@/lib/cart";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const org = await getOrg();
  const [categories, cartCount, session] = await Promise.all([
    prisma.category.findMany({
      where: { orgId: org.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    getCartItemCount(getCartId()),
    auth(),
  ]);
  const customerName = session?.user?.type === "customer" ? session.user.name || session.user.phone : null;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-[72px] lg:pb-0">
      <Topbar cartCount={cartCount} customerName={customerName} />
      <div className="mx-auto flex w-full max-w-[430px] flex-1 gap-6 pt-[122px] sm:max-w-2xl md:max-w-4xl lg:max-w-none lg:items-start lg:px-8 lg:pt-28 xl:px-12">
        <CategorySidebar categories={categories} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Footer />
      <BottomNav cartCount={cartCount} />
    </div>
  );
}
