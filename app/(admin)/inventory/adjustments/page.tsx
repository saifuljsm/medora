import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StockAdjustmentForm } from "@/components/admin/stock-adjustment-form";

export default async function StockAdjustmentsPage() {
  const session = await auth();
  if (!session?.user) return null;
  assertCan(session.user, "stock:adjust");

  const [batches, adjustments] = await Promise.all([
    prisma.batch.findMany({
      where: { orgId: session.user.orgId, quantity: { gt: 0 } },
      include: { product: true, branch: true },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.stockAdjustment.findMany({
      where: { orgId: session.user.orgId },
      include: { batch: { include: { product: true } }, adjustedBy: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-xl font-bold text-foreground">Stock adjustments</h1>
      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>By</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No adjustments yet.
                  </TableCell>
                </TableRow>
              )}
              {adjustments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.batch.product.brandName}</TableCell>
                  <TableCell>{a.quantity}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.reason}</Badge>
                  </TableCell>
                  <TableCell>{a.adjustedBy.name}</TableCell>
                  <TableCell>{a.createdAt.toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <StockAdjustmentForm
          batches={batches.map((b) => ({
            id: b.id,
            label: `${b.product.brandName} — ${b.batchNumber} (${b.branch.name})`,
            quantity: b.quantity,
          }))}
        />
      </div>
    </div>
  );
}
