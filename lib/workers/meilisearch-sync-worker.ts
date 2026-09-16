import { Worker } from "bullmq";
import { redisConnection, QUEUE_NAMES, type MeilisearchSyncJobData } from "@/lib/queue";
import { ensureProductsIndex, syncProducts } from "@/lib/meilisearch";

export function startMeilisearchSyncWorker(): Worker {
  return new Worker(
    QUEUE_NAMES.meilisearchSync,
    async (job) => {
      const { productIds } = job.data as MeilisearchSyncJobData;
      await syncProducts(productIds);
      console.log("[meilisearch-sync]", productIds.length, "product(s) synced");
    },
    { connection: redisConnection },
  );
}

if (require.main === module) {
  ensureProductsIndex()
    .then(() => {
      const worker = startMeilisearchSyncWorker();
      console.log("meilisearch-sync worker listening…");
      process.on("SIGINT", () => worker.close().then(() => process.exit(0)));
    })
    .catch((err) => {
      console.error("Failed to initialize the Meilisearch products index:", err);
      process.exit(1);
    });
}
