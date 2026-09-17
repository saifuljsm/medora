"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { issueOtp, OtpCooldownError, OtpRateLimitedError } from "@/lib/otp";
import { sendOtpSms } from "@/lib/sms";

const PhoneSchema = z.string().trim().min(6, "Enter a valid phone number");

export type RequestOtpResult = { success: true } | { success: false; error: string };

export async function requestOtpAction(phone: string): Promise<RequestOtpResult> {
  const parsed = PhoneSchema.safeParse(phone);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid phone number" };

  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers().get("x-real-ip");

  try {
    const code = await issueOtp(parsed.data, ip);
    await sendOtpSms(parsed.data, code);
    return { success: true };
  } catch (error) {
    if (error instanceof OtpCooldownError || error instanceof OtpRateLimitedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Couldn't send a code right now — please try again." };
  }
}
