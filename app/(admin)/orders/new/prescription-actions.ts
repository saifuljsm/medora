"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const Schema = z.object({ imageUrl: z.string().min(1, "A prescription photo is required") });

export type CreateAndApproveResult = { success: true; prescriptionId: string } | { success: false; error: string };

/**
 * Staff-assisted-order equivalent of POS's createAndApprovePrescriptionForPos
 * — same on-the-spot approval, just not branch-scoped (online orders aren't
 * tied to a branch). Only OWNER/PHARMACIST have prescription:review; ADMIN
 * (who has orders:createStaffAssisted) does not, so an ADMIN creating this
 * order has to rely on an already-approved prescription instead — this
 * action will correctly reject them.
 */
export async function createAndApprovePrescriptionForOrder(input: z.infer<typeof Schema>): Promise<CreateAndApproveResult> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    assertCan(session.user, "prescription:review");
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
