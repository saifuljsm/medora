import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { QuickEntryForm } from "@/components/admin/quick-entry-form";

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
    <div className="mx-auto max-w-lg px-6 py-8">
      <h1 className="mb-6 text-xl font-bold text-foreground">Quick stock entry — {branch.name}</h1>
      <QuickEntryForm
        branchId={branch.id}
        products={products.map((p) => ({ id: p.id, label: `${p.brandName} — ${p.medicine.genericName}` }))}
      />
    </div>
  );
}
