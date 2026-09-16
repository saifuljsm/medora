import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { QuickEntryForm } from "@/components/admin/quick-entry-form";
import { PageHeader } from "@/components/admin/page-header";

export default async function QuickEntryPage() {
  const session = await auth();
  if (!session?.user) return null;

  const branch = session.user.branchId
    ? await prisma.branch.findUnique({ where: { id: session.user.branchId } })
    : await prisma.branch.findFirst({ where: { orgId: session.user.orgId }, orderBy: { createdAt: "asc" } });
  if (!branch) redirect("/dashboard");

  try {
    assertCan(session.user, "stock:quickEntry", { branchId: branch.id });
  } catch {
    redirect("/dashboard");
  }

  const products = await prisma.product.findMany({ include: { medicine: true }, orderBy: { brandName: "asc" } });

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="Quick stock entry" description={branch.name} />
      <QuickEntryForm
        branchId={branch.id}
        products={products.map((p) => ({ id: p.id, label: `${p.brandName} — ${p.medicine.genericName}` }))}
      />
    </div>
  );
}
