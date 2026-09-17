import crypto from "crypto";
import { redisConnection } from "@/lib/queue";

const CODE_TTL_SECONDS = 300; // 5 minutes
const COOLDOWN_SECONDS = 60; // between requests for the same phone
const MAX_ATTEMPTS = 5;
const IP_LIMIT_WINDOW_SECONDS = 3600; // 1 hour
const IP_LIMIT_MAX_REQUESTS = 10; // per IP per window — each one is a real SMS spend once BDBULKSMS_API_KEY is set

function codeKey(phone: string): string {
  return `otp:code:${phone}`;
}
function cooldownKey(phone: string): string {
  return `otp:cooldown:${phone}`;
}
function attemptsKey(phone: string): string {
  return `otp:attempts:${phone}`;
}

export class OtpCooldownError extends Error {
  constructor() {
    super("Please wait a bit before requesting another code.");
    this.name = "OtpCooldownError";
  }
}

export class OtpRateLimitedError extends Error {
  constructor() {
    super("Too many code requests from this connection — please try again later.");
    this.name = "OtpRateLimitedError";
  }
}

/**
 * Generates and stores a new OTP for `phone`, returning it so the caller
 * can send it. Throws OtpCooldownError if requested too soon after a
 * previous one for the same phone, or OtpRateLimitedError if `ip` has
 * requested too many codes recently (each one is a real SMS spend once
 * bdbulksms is configured, so this exists to blunt someone hammering
 * different phone numbers from one connection).
 */
export async function issueOtp(phone: string, ip?: string | null): Promise<string> {
  const onCooldown = await redisConnection.get(cooldownKey(phone));
  if (onCooldown) throw new OtpCooldownError();

  if (ip) {
    const ipKey = `otp:ip:${ip}`;
    const count = await redisConnection.incr(ipKey);
    if (count === 1) await redisConnection.expire(ipKey, IP_LIMIT_WINDOW_SECONDS);
    if (count > IP_LIMIT_MAX_REQUESTS) throw new OtpRateLimitedError();
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  await redisConnection.set(codeKey(phone), code, "EX", CODE_TTL_SECONDS);
  await redisConnection.set(cooldownKey(phone), "1", "EX", COOLDOWN_SECONDS);
  await redisConnection.del(attemptsKey(phone));
  return code;
}

/** Verifies `code` against the stored OTP for `phone`. Consumes the code (single use) on success; tracks failed attempts and invalidates the code after MAX_ATTEMPTS. */
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const stored = await redisConnection.get(codeKey(phone));
  if (!stored) return false;

  if (stored !== code) {
    const attempts = await redisConnection.incr(attemptsKey(phone));
    if (attempts === 1) await redisConnection.expire(attemptsKey(phone), CODE_TTL_SECONDS);
    if (attempts >= MAX_ATTEMPTS) {
      await redisConnection.del(codeKey(phone));
    }
    return false;
  }

  await redisConnection.del(codeKey(phone));
  await redisConnection.del(attemptsKey(phone));
  return true;
}
