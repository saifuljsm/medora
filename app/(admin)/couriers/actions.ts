"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const CreateCourierSchema = z.object({ name: z.string().trim().min(1, "Name is required") });

export async function createCourierAction(input: z.infer<typeof CreateCourierSchema>): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Not signed in" };

  const parsed = CreateCourierSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    assertCan(session.user, "orders:manage");
  } catch {
    return { success: false, error: "Not permitted" };
  }

  try {
    // isApiIntegrated stays false for every courier in V1 — manual dispatch
    // only, per the Courier model's comment; API integration is a later phase.
    await prisma.courier.create({ data: { name: parsed.data.name } });
  } catch {
    return { success: false, error: "A courier with that name already exists" };
  }

  revalidatePath("/couriers");
  return { success: true };
}
