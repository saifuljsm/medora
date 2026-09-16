import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const session = await auth();
  if (!session?.user) return null;
  assertCan(session.user, "reports:view");

  const to = searchParams.to ? endOfDay(new Date(searchParams.to)) : endOfDay(new Date());
  const from = searchParams.from
    ? startOfDay(new Date(searchParams.from))
    : startOfDay(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

  const sales = await prisma.sale.findMany({
    where: { orgId: session.user.orgId, createdAt: { gte: from, lte: to } },
    select: { channel: true, invoiceNumber: true, subtotal: true, discount: true, taxAmount: true, deliveryFee: true, total: true },
  });

  const byChannel = { POS: sales.filter((s) => s.channel === "POS"), ONLINE: sales.filter((s) => s.channel === "ONLINE") };

  function summarize(rows: typeof sales) {
    return rows.reduce(
      (acc, s) => ({
        count: acc.count + 1,
        subtotal: acc.subtotal + Number(s.subtotal),
        discount: acc.discount + Number(s.discount),
        tax: acc.tax + Number(s.taxAmount),
        deliveryFee: acc.deliveryFee + Number(s.deliveryFee),
        total: acc.total + Number(s.total),
      }),
      { count: 0, subtotal: 0, discount: 0, tax: 0, deliveryFee: 0, total: 0 },
    );
  }

  const posSummary = summarize(byChannel.POS);
  const onlineSummary = summarize(byChannel.ONLINE);
  const allSummary = summarize(sales);

  const rows = [
    { label: "POS (invoice prefix POS-)", ...posSummary },
    { label: "Ecommerce (invoice prefix ECOM-)", ...onlineSummary },
    { label: "Total", ...allSummary },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-1 text-xl font-bold text-foreground">Sales report</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {from.toLocaleDateString()} – {to.toLocaleDateString()}
      </p>

      <form className="mb-6 flex items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from.toISOString().slice(0, 10)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to.toISOString().slice(0, 10)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Apply
        </button>
      </form>

      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Channel</TableHead>
              <TableHead>Sales</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label} className={row.label === "Total" ? "font-semibold" : ""}>
                <TableCell>{row.label}</TableCell>
                <TableCell>{row.count}</TableCell>
                <TableCell>৳{row.subtotal.toFixed(2)}</TableCell>
                <TableCell>৳{row.discount.toFixed(2)}</TableCell>
                <TableCell>৳{row.tax.toFixed(2)}</TableCell>
                <TableCell>৳{row.deliveryFee.toFixed(2)}</TableCell>
                <TableCell>৳{row.total.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
