import { prisma } from "@/lib/prisma";

/** Single-tenant: there is exactly one Org row. */
export async function getOrg() {
  return prisma.org.findFirstOrThrow();
}
