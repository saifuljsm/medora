import { NextResponse } from "next/server";
import { runExpiryCheck } from "@/lib/expiry-check";

// Triggered by Vercel Cron (vercel.json), once daily. Runs inline within
// this serverless function — see lib/redis.ts for why this isn't a BullMQ
// queue+worker.
export async function GET() {
  const results = await runExpiryCheck();
  console.log("[expiry-check]", JSON.stringify(results));
  return NextResponse.json({ ok: true, results });
}
