import { Queue } from "bullmq";
import IORedis from "ioredis";

const globalForRedis = globalThis as unknown as { redisConnection: IORedis | undefined };

export const redisConnection =
  globalForRedis.redisConnection ??
  new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });

if (process.env.NODE_ENV !== "production") globalForRedis.redisConnection = redisConnection;

export const QUEUE_NAMES = {
  expiryCheck: "expiry-check",
  meilisearchSync: "meilisearch-sync",
} as const;

const globalForQueues = globalThis as unknown as {
  expiryCheckQueue: Queue | undefined;
  meilisearchSyncQueue: Queue | undefined;
};

export const expiryCheckQueue =
  globalForQueues.expiryCheckQueue ?? new Queue(QUEUE_NAMES.expiryCheck, { connection: redisConnection });
if (process.env.NODE_ENV !== "production") globalForQueues.expiryCheckQueue = expiryCheckQueue;

export const meilisearchSyncQueue =
  globalForQueues.meilisearchSyncQueue ?? new Queue(QUEUE_NAMES.meilisearchSync, { connection: redisConnection });
if (process.env.NODE_ENV !== "production") globalForQueues.meilisearchSyncQueue = meilisearchSyncQueue;

export interface MeilisearchSyncJobData {
  productIds: string[];
}
