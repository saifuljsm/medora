import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CashReconciliationForm } from "@/components/admin/cash-reconciliation-form";

export default async function ReconciliationPage() {
  const session = await auth();
  if (!session?.user) return null;

  const branch = session.user.branchId
    ? await prisma.branch.findUnique({ where: { id: session.user.branchId } })
    : await prisma.branch.findFirst({ where: { orgId: session.user.orgId }, orderBy: { createdAt: "asc" } });
  if (!branch) redirect("/dashboard");

  try {
    assertCan(session.user, "reconciliation:manage", { branchId: branch.id });
  } catch {
    redirect("/dashboard");
  }

  const history = await prisma.cashReconciliation.findMany({
    where: { orgId: session.user.orgId, branchId: branch.id },
    orderBy: { date: "desc" },
    take: 30,
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-6 text-xl font-bold text-foreground">Cash reconciliation — {branch.name}</h1>
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Opening</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Counted</TableHead>
                <TableHead>Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No reconciliations yet.
                  </TableCell>
                </TableRow>
              )}
              {history.map((row) => {
                const variance = Number(row.variance);
                return (
                  <TableRow key={row.id}>
                    <TableCell>{row.date.toLocaleDateString()}</TableCell>
                    <TableCell>৳{Number(row.openingFloat).toFixed(2)}</TableCell>
                    <TableCell>৳{Number(row.expectedCash).toFixed(2)}</TableCell>
                    <TableCell>৳{Number(row.countedCash).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={variance === 0 ? "secondary" : variance > 0 ? "outline" : "destructive"}>
                        {variance > 0 ? "+" : ""}
                        ৳{variance.toFixed(2)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <CashReconciliationForm branchId={branch.id} />
      </div>
    </div>
  );
}
