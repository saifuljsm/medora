import { prisma } from "@/lib/prisma";

const EXPIRY_WARNING_WINDOW_DAYS = 90;

export interface ExpiryCheckResult {
  branchId: string;
  branchName: string;
  expiringBatchCount: number;
  soonestExpiryDate: string | null;
}

/**
 * No SMS/email notification channel exists for this yet — SMS stays
 * scoped to OTP only per the build spec (§8 rule 9), and there's no
 * staff email flow defined. This job's output today is the dashboard's
 * expiry-alerts source of truth; wiring an actual notification is future
 * work once a channel is decided.
 */
export async function runExpiryCheck(): Promise<ExpiryCheckResult[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + EXPIRY_WARNING_WINDOW_DAYS);

  const branches = await prisma.branch.findMany();
  const results: ExpiryCheckResult[] = [];

  for (const branch of branches) {
    const expiring = await prisma.batch.findMany({
      where: { branchId: branch.id, quantity: { gt: 0 }, expiryDate: { lte: cutoff } },
      orderBy: { expiryDate: "asc" },
      select: { expiryDate: true },
    });
    results.push({
      branchId: branch.id,
      branchName: branch.name,
      expiringBatchCount: expiring.length,
      soonestExpiryDate: expiring[0]?.expiryDate.toISOString() ?? null,
    });
  }

  return results;
}
