import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PrescriptionReviewRow } from "@/components/admin/prescription-review-row";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

export default async function PrescriptionsPage() {
  const session = await auth();
  assertCan(session!.user, "prescription:review");

  const pending = await prisma.prescription.findMany({
    where: { orgId: session!.user.orgId, status: "PENDING" },
    include: { customer: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader title="Prescription review" description="Online prescription uploads waiting for approval before checkout can complete." />

      <div className="rounded-xl border border-border bg-card px-4">
        {pending.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing pending review.</p>
        ) : (
          pending.map((p) => (
            <PrescriptionReviewRow
              key={p.id}
              id={p.id}
              imageUrl={p.imageUrl}
              customerName={p.customer?.name ?? ""}
              customerPhone={p.customer?.phone ?? ""}
              createdAt={p.createdAt.toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
            />
          ))
        )}
      </div>
    </div>
  );
}
