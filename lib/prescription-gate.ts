import type { TxClient } from "@/lib/stock";

/**
 * The hard, server-side prescription gate (build spec §8, rule 1): a Sale
 * containing a SaleItem whose Medicine.requiresPrescription is true cannot
 * reach a completed state until a linked Prescription is APPROVED. Shared
 * by createPosSale (Phase 1.6) and createOnlineSale (Phase 2.5) so the
 * rule lives in exactly one place.
 */

export class PrescriptionRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrescriptionRequiredError";
  }
}

export async function assertPrescriptionRequirementsMet(
  tx: TxClient,
  params: { orgId: string; productIds: string[]; prescriptionId?: string | null },
): Promise<void> {
  const requiringProducts = await tx.product.findMany({
    where: { id: { in: params.productIds }, medicine: { requiresPrescription: true } },
    select: { id: true },
  });
  if (requiringProducts.length === 0) return;

  if (!params.prescriptionId) {
    throw new PrescriptionRequiredError(
      "This sale includes a prescription-required item — attach an approved prescription first.",
    );
  }

  const prescription = await tx.prescription.findUnique({ where: { id: params.prescriptionId } });
  if (!prescription || prescription.orgId !== params.orgId) {
    throw new PrescriptionRequiredError("Attached prescription not found.");
  }
  if (prescription.status !== "APPROVED") {
    throw new PrescriptionRequiredError("The attached prescription has not been approved yet.");
  }
  if (prescription.saleId) {
    throw new PrescriptionRequiredError("This prescription is already attached to another sale.");
  }
}
