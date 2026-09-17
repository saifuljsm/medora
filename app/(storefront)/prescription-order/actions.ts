"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SubmitPrescriptionSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  imageUrl: z.string().url("Upload a prescription photo first"),
});

export type SubmitPrescriptionResult = { success: true } | { success: false; error: string };

/** Requires a signed-in (phone-verified) customer — see lib/auth.ts's customer-otp provider. Uploading against a typed, unverified phone number let anyone claim someone else's number. */
export async function submitPrescriptionAction(input: z.infer<typeof SubmitPrescriptionSchema>): Promise<SubmitPrescriptionResult> {
  const session = await auth();
  if (session?.user?.type !== "customer") {
    return { success: false, error: "Sign in with your phone first." };
  }

  const parsed = SubmitPrescriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, imageUrl } = parsed.data;

  if (name !== session.user.name) {
    await prisma.customer.update({ where: { id: session.user.id }, data: { name } });
  }

  await prisma.prescription.create({
    data: { orgId: session.user.orgId, customerId: session.user.id, imageUrl, status: "PENDING" },
  });

  return { success: true };
}
