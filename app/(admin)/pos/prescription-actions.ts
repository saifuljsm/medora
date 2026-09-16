"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const CreateAndApproveSchema = z.object({
  imageUrl: z.string().min(1, "A prescription photo/reference is required"),
  branchId: z.string().min(1),
});

export type CreateAndApprovePrescriptionInput = z.infer<typeof CreateAndApproveSchema>;

export type CreateAndApprovePrescriptionResult =
  | { success: true; prescriptionId: string }
  | { success: false; error: string };

/**
 * POS-specific shortcut: the pharmacist is physically at the counter
 * looking at the paper prescription right now, so creation and approval
 * happen as one action rather than a separate PENDING -> review step (that
 * async review flow is what Phase 2's online-order prescriptions need,
 * since there the photo arrives before any pharmacist looks at it).
 */
export async function createAndApprovePrescriptionForPos(
  input: CreateAndApprovePrescriptionInput,
): Promise<CreateAndApprovePrescriptionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = CreateAndApproveSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    assertCan(session.user, "prescription:review", { branchId: parsed.data.branchId });
  } catch {
    return { success: false, error: "Only a pharmacist (or the owner) can approve a prescription." };
  }

  const prescription = await prisma.prescription.create({
    data: {
      orgId: session.user.orgId,
      imageUrl: parsed.data.imageUrl,
      status: "APPROVED",
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  });

  return { success: true, prescriptionId: prescription.id };
}
