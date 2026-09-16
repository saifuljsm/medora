import Link from "next/link";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  ORDERED: "default",
  RECEIVED: "secondary",
  PARTIALLY_RECEIVED: "secondary",
  CANCELED: "destructive",
};

export default async function PurchaseOrdersPage() {
  const session = await auth();
  if (!session?.user) return null;
  assertCan(session.user, "purchasing:manage");

  const orders = await prisma.purchaseOrder.findMany({
    where: { orgId: session.user.orgId },
    include: { supplier: true, branch: true, items: true },
    orderBy: { orderedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Purchase orders"
        actions={
          <Button asChild>
            <Link href="/purchasing/orders/new">New purchase order</Link>
          </Button>
        }
      />
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ordered</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No purchase orders yet.
                </TableCell>
              </TableRow>
            )}
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.supplier.name}</TableCell>
                <TableCell>{order.branch.name}</TableCell>
                <TableCell>{order.items.length}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>{order.status}</Badge>
                </TableCell>
                <TableCell>{order.orderedAt.toLocaleDateString()}</TableCell>
                <TableCell>
                  {order.status !== "RECEIVED" && order.status !== "CANCELED" && (
                    <Link href={`/purchasing/orders/${order.id}/receive`} className="text-sm font-medium text-primary hover:underline">
                      Receive
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
