import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const WARNING_WINDOW_DAYS = 90;
const URGENT_WINDOW_DAYS = 30;

export default async function ExpiryAlertsPage() {
  const session = await auth();
  if (!session?.user) return null;
  assertCan(session.user, "stock:adjust"); // same INVENTORY_MANAGER+ scope as write-offs

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + WARNING_WINDOW_DAYS);

  const batches = await prisma.batch.findMany({
    where: { orgId: session.user.orgId, quantity: { gt: 0 }, expiryDate: { lte: cutoff } },
    include: { product: { include: { medicine: true } }, branch: true },
    orderBy: { expiryDate: "asc" },
  });

  const now = new Date();
  const urgentCutoff = new Date();
  urgentCutoff.setDate(urgentCutoff.getDate() + URGENT_WINDOW_DAYS);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-1 text-xl font-bold text-foreground">Expiry alerts</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Batches with stock expiring within {WARNING_WINDOW_DAYS} days, soonest first.
      </p>
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Nothing expiring in the next {WARNING_WINDOW_DAYS} days.
                </TableCell>
              </TableRow>
            )}
            {batches.map((batch) => {
              const isExpired = batch.expiryDate < now;
              const isUrgent = !isExpired && batch.expiryDate <= urgentCutoff;
              return (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">
                    {batch.product.brandName} — {batch.product.medicine.genericName}
                  </TableCell>
                  <TableCell>{batch.branch.name}</TableCell>
                  <TableCell>{batch.batchNumber}</TableCell>
                  <TableCell>{batch.expiryDate.toLocaleDateString()}</TableCell>
                  <TableCell>{batch.quantity}</TableCell>
                  <TableCell>
                    {isExpired ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : isUrgent ? (
                      <Badge variant="destructive">Expiring soon</Badge>
                    ) : (
                      <Badge variant="outline">Upcoming</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
