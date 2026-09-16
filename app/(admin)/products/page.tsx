import Link from "next/link";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user) return null;
  assertCan(session.user, "catalog:manage");

  const [products, stockRows] = await Promise.all([
    prisma.product.findMany({ include: { medicine: true }, orderBy: { brandName: "asc" } }),
    prisma.batch.groupBy({
      by: ["productId"],
      where: { orgId: session.user.orgId, quantity: { gt: 0 } },
      _sum: { quantity: true },
      _min: { expiryDate: true },
    }),
  ]);

  const stockByProduct = new Map(stockRows.map((r) => [r.productId, { qty: r._sum.quantity ?? 0, nearestExpiry: r._min.expiryDate }]));
  const now = new Date();
  const urgentCutoff = new Date();
  urgentCutoff.setDate(urgentCutoff.getDate() + 30);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Products</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/products/import">Bulk import</Link>
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Generic</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Nearest expiry</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const stock = stockByProduct.get(p.id);
              const isUrgent = stock?.nearestExpiry && stock.nearestExpiry <= urgentCutoff;
              const isExpired = stock?.nearestExpiry && stock.nearestExpiry < now;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.brandName}</TableCell>
                  <TableCell>{p.medicine.genericName}</TableCell>
                  <TableCell>{p.barcode ?? "—"}</TableCell>
                  <TableCell>{stock?.qty ?? 0}</TableCell>
                  <TableCell>
                    {stock?.nearestExpiry ? (
                      <Badge variant={isExpired ? "destructive" : isUrgent ? "destructive" : "outline"}>
                        {stock.nearestExpiry.toLocaleDateString()}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/products/${p.id}/edit`} className="text-sm font-medium text-primary hover:underline">
                      Edit
                    </Link>
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
