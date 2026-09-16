import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Prisma's interactive-transaction default (5000ms) is tuned for a local
 * database. Against Neon's pooled connection, each round trip inside a
 * transaction (FEFO allocation, invoice counter, etc.) carries real network
 * latency, so a multi-step sale/purchase/adjustment transaction can blow
 * through 5s even when every query is individually fast. Pass this to every
 * $transaction that does more than one or two queries.
 */
export const TRANSACTION_TIMEOUT_MS = 15000;
