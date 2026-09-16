import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getOrg } from "@/lib/org";

export const dynamic = "force-dynamic";

export default async function AllCategoriesPage() {
  const org = await getOrg();
  const categories = await prisma.category.findMany({ where: { orgId: org.id, active: true }, orderBy: { name: "asc" } });

  return (
    <div className="px-4 pt-4 lg:px-0">
      <h1 className="mb-3 text-base font-bold text-foreground lg:text-2xl">All categories</h1>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/${cat.slug}`}
            className="group flex min-h-11 flex-col items-center gap-[7px] rounded-xl border border-border bg-card p-[12px_6px] transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
          >
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-primary-tint text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <ShieldCheck className="h-[21px] w-[21px]" strokeWidth={1.8} />
            </div>
            <span className="text-center text-[11.5px] font-medium leading-tight text-foreground">{cat.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
