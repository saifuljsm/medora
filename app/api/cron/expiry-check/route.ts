import { NextResponse } from "next/server";
import { expiryCheckQueue } from "@/lib/queue";

// Triggered by Vercel Cron (vercel.json) in production. A worker process
// (lib/workers/expiry-check-worker.ts) must be running to actually consume
// jobs from this queue — see package.json's `worker:expiry-check` script.
export async function GET() {
  const job = await expiryCheckQueue.add("expiry-check", {});
  return NextResponse.json({ enqueued: true, jobId: job.id });
}
