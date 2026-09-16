"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const ReviewSchema = z.object({
  prescriptionId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export type ReviewPrescriptionResult = { success: true } | { success: false; error: string };

/**
 * Reviews an online-order prescription upload (Phase 2.11's standalone
 * flow). No branchId — online prescriptions aren't tied to a branch, unlike
 * POS's createAndApprovePrescriptionForPos.
 */
export async function reviewPrescriptionAction(input: z.infer<typeof ReviewSchema>): Promise<ReviewPrescriptionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = ReviewSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid input" };

  try {
    assertCan(session.user, "prescription:review");
  } catch {
    return { success: false, error: "Only a pharmacist (or the owner) can review prescriptions." };
  }

  const prescription = await prisma.prescription.findUnique({ where: { id: parsed.data.prescriptionId } });
  if (!prescription || prescription.orgId !== session.user.orgId) {
    return { success: false, error: "Prescription not found" };
  }
  if (prescription.status !== "PENDING") {
    return { success: false, error: "This prescription has already been reviewed" };
  }

  await prisma.prescription.update({
    where: { id: prescription.id },
    data: { status: parsed.data.decision, reviewedById: session.user.id, reviewedAt: new Date() },
  });

  revalidatePath("/prescriptions");
  return { success: true };
}
