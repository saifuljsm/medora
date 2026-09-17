import IORedis from "ioredis";

/**
 * Shared Redis client — cart (lib/cart.ts) and OTP codes (lib/otp.ts) talk
 * to it directly. This used to also back two BullMQ queues (expiry-check,
 * meilisearch-sync), but that required a persistent Worker process, which
 * has nowhere to run: the build spec's hosting line is explicit — "Vercel
 * (do not configure Docker/EC2 — that's a future migration, not now)" —
 * and Vercel's serverless functions can't host a long-lived BullMQ Worker.
 * Neither job actually needs queue semantics (retries/backoff/concurrency
 * smoothing): expiry-check is one Vercel Cron invocation a day
 * (lib/expiry-check.ts, called directly from the cron route), and
 * Meilisearch sync is one fast HTTP call already made from inside a
 * Server Action (lib/meilisearch.ts's syncProducts, called directly).
 * Both now just run inline within the serverless function that triggers
 * them — still real work, just no queue/worker indirection.
 */
const globalForRedis = globalThis as unknown as { redisConnection: IORedis | undefined };

export const redisConnection =
  globalForRedis.redisConnection ??
  new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });

if (process.env.NODE_ENV !== "production") globalForRedis.redisConnection = redisConnection;
