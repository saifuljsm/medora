"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Phone, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestOtpAction } from "@/app/(storefront)/account/actions";

const OTP_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "That code is incorrect or has expired.",
};

export function CustomerSignInForm({ redirectTo = "/account" }: { redirectTo?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const result = await requestOtpAction(phone);
    setIsPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setStep("code");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const result = await signIn("customer-otp", { phone: phone.trim(), code: code.trim(), redirect: false });
    setIsPending(false);

    if (result?.error) {
      setError(OTP_ERROR_MESSAGES[result.error] ?? "Sign-in failed. Please try again.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={handleVerify} className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-primary-tint px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
          <p className="text-xs text-foreground">
            Code sent to <b>{phone}</b>.{" "}
            <button type="button" onClick={() => setStep("phone")} className="font-semibold text-primary underline">
              Change
            </button>
          </p>
        </div>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-digit code"
          inputMode="numeric"
          autoFocus
          required
        />
        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
        <Button type="submit" disabled={isPending || code.length !== 6} className="h-11 bg-mint text-white hover:bg-mint-dark">
          {isPending ? "Verifying…" : "Verify & sign in"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequestOtp} className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl bg-primary-tint px-3 py-2.5">
        <Phone className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
          inputMode="tel"
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-text"
          required
        />
      </div>
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="h-11 bg-mint text-white hover:bg-mint-dark">
        {isPending ? "Sending…" : "Send code"}
      </Button>
    </form>
  );
}
