"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrg } from "@/lib/org";

const SubmitPrescriptionSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(6, "A valid phone number is required"),
  imageUrl: z.string().url("Upload a prescription photo first"),
});

export type SubmitPrescriptionResult = { success: true } | { success: false; error: string };

export async function submitPrescriptionAction(input: z.infer<typeof SubmitPrescriptionSchema>): Promise<SubmitPrescriptionResult> {
  const parsed = SubmitPrescriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, phone, imageUrl } = parsed.data;

  const org = await getOrg();

  const customer = await prisma.customer.upsert({
    where: { orgId_phone: { orgId: org.id, phone } },
    update: { name },
    create: { orgId: org.id, phone, name },
  });

  await prisma.prescription.create({
    data: { orgId: org.id, customerId: customer.id, imageUrl, status: "PENDING" },
  });

  return { success: true };
}
