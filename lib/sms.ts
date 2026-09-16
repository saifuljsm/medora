/**
 * bdbulksms.com OTP wrapper. SMS stays scoped to OTP only, per the build
 * spec (§8 rule 9) — no marketing/notification blast use.
 *
 * Without BDBULKSMS_API_KEY configured, this falls back to a mock mode
 * that logs the code to the server console instead of sending a real SMS —
 * lets the whole OTP login flow be built and tested end-to-end before that
 * credential exists. The real bdbulksms.com request shape below is a
 * best-guess based on their typical HTTP gateway pattern (api key + sender
 * id + msisdn + message as query/form params); it has NOT been verified
 * against their actual API docs, since no account/docs access was
 * available while building this. Treat it as a starting point to correct
 * once real credentials and docs are in hand, not as tested code.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const apiKey = process.env.BDBULKSMS_API_KEY;
  const senderId = process.env.BDBULKSMS_SENDER_ID;
  const message = `Your Medora verification code is ${code}. It expires in 5 minutes.`;

  if (!apiKey || !senderId) {
    console.log(`[MOCK SMS to ${phone}] ${message}`);
    return;
  }

  const url = new URL("https://api.bdbulksms.net/api.php");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("senderid", senderId);
  url.searchParams.set("msisdn", phone);
  url.searchParams.set("message", message);

  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) {
    throw new Error(`bdbulksms request failed: ${response.status}`);
  }
}
