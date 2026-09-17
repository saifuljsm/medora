/**
 * bdbulksms.com (bdbulksms.net) OTP wrapper. SMS stays scoped to OTP only,
 * per the build spec (§8 rule 9) — no marketing/notification blast use.
 *
 * Without BDBULKSMS_API_KEY configured, this falls back to a mock mode
 * that logs the code to the server console instead of sending a real SMS —
 * lets the whole OTP login flow be built and tested end-to-end before that
 * credential exists.
 *
 * Endpoint/params confirmed by an actual send: HTTP 200 with body
 * "Ok: SMS Sent Successfully To +8801XXXXXXXXX" on success. This gateway
 * doesn't appear to use HTTP status codes for failures (a bad token would
 * presumably still come back 200 with an "Error: ..." body, matching their
 * plain-text-response style elsewhere in the docs), so success is
 * determined by the body prefix, not response.ok alone.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const token = process.env.BDBULKSMS_API_KEY;
  const senderId = process.env.BDBULKSMS_SENDER_ID;
  const message = `Your Medora verification code is ${code}. It expires in 5 minutes.`;

  if (!token || !senderId) {
    console.log(`[MOCK SMS to ${phone}] ${message}`);
    return;
  }

  const url = new URL("https://api.bdbulksms.net/g_api.php");
  url.searchParams.set("token", token);
  url.searchParams.set("senderid", senderId);
  url.searchParams.set("to", phone);
  url.searchParams.set("message", message);

  const response = await fetch(url.toString(), { method: "GET" });
  const body = await response.text();
  if (!response.ok || !body.trim().startsWith("Ok")) {
    throw new Error(`bdbulksms send failed: ${body.trim()}`);
  }
}
