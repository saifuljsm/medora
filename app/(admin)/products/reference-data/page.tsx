import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { ManufacturerForm } from "@/components/admin/manufacturer-form";
import { MedicineCategoryForm } from "@/components/admin/medicine-category-form";

export const dynamic = "force-dynamic";

export default async function ReferenceDataPage() {
  const session = await auth();
  assertCan(session!.user, "catalog:manage");

  const [manufacturers, categories, medicines] = await Promise.all([
    prisma.manufacturer.findMany({ orderBy: { name: "asc" } }),
    prisma.medicineCategory.findMany({ where: { orgId: session!.user.orgId }, orderBy: { name: "asc" } }),
    prisma.medicine.findMany({
      select: { genericName: true, form: true, strength: true },
      distinct: ["genericName", "form", "strength"],
      orderBy: { genericName: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Reference data"
        description="Manufacturers, categories, and generic names — set these up once, then reuse the exact spelling in your Excel import."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-foreground">Manufacturers</h2>
          <ManufacturerForm />
          <div className="mt-3 max-h-72 overflow-y-auto">
            {manufacturers.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">None yet.</p>
            ) : (
              manufacturers.map((m) => (
                <div key={m.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-b-0">
                  <span className="font-medium text-foreground">{m.name}</span>
                  {m.country && <span className="text-xs text-muted-text">{m.country}</span>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-foreground">Categories (clinical)</h2>
          <MedicineCategoryForm />
          <div className="mt-3 max-h-72 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">None yet.</p>
            ) : (
              categories.map((c) => (
                <div key={c.id} className="border-b border-border py-2 text-sm font-medium text-foreground last:border-b-0">
                  {c.name}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-bold text-foreground">Generic names already in use</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Reference only — reuse the exact spelling shown here in your Excel file so it matches instead of creating a duplicate.
        </p>
        <div className="max-h-96 overflow-y-auto">
          {medicines.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">None yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Generic name</th>
                  <th className="py-1.5 pr-3 font-medium">Form</th>
                  <th className="py-1.5 font-medium">Strength</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    <td className="py-1.5 pr-3 font-medium text-foreground">{m.genericName}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{m.form}</td>
                    <td className="py-1.5 text-muted-foreground">{m.strength ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
