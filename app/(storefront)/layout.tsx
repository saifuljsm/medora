import { Topbar } from "@/components/storefront/topbar";
import { BottomNav } from "@/components/storefront/bottom-nav";
import { CategorySidebar } from "@/components/storefront/category-sidebar";
import { prisma } from "@/lib/prisma";
import { getOrg } from "@/lib/org";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const org = await getOrg();
  const categories = await prisma.category.findMany({
    where: { orgId: org.id, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <div className="mx-auto flex w-full max-w-[430px] gap-6 pb-[72px] pt-[104px] sm:max-w-2xl md:max-w-4xl lg:max-w-7xl lg:items-start lg:px-8 lg:pb-12 lg:pt-28">
        <CategorySidebar categories={categories} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
