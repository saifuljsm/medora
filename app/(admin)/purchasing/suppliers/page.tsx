import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { SupplierForm } from "@/components/admin/supplier-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user) return null; // (admin)/layout.tsx already redirects unauthenticated staff
  assertCan(session.user, "purchasing:manage");

  const suppliers = await prisma.supplier.findMany({
    where: { orgId: session.user.orgId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-6 text-xl font-bold text-foreground">Suppliers</h1>
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    No suppliers yet.
                  </TableCell>
                </TableRow>
              )}
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.phone ?? "—"}</TableCell>
                  <TableCell>{s.address ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <SupplierForm />
      </div>
    </div>
  );
}
