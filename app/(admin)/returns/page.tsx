import Link from "next/link";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";

export default async function ReturnsPage() {
  const session = await auth();
  if (!session?.user) return null;
  assertCan(session.user, "returns:process");

  const returns = await prisma.return.findMany({
    where: { sale: { orgId: session.user.orgId } },
    include: { sale: true, processedBy: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Returns"
        actions={
          <Button asChild>
            <Link href="/returns/new">New return</Link>
          </Button>
        }
      />
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Refund</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Processed by</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No returns yet.
                </TableCell>
              </TableRow>
            )}
            {returns.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.sale.invoiceNumber}</TableCell>
                <TableCell>{r.items.length}</TableCell>
                <TableCell>৳{Number(r.refundAmount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{r.refundMethod}</Badge>
                </TableCell>
                <TableCell>{r.processedBy.name}</TableCell>
                <TableCell>{r.createdAt.toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
