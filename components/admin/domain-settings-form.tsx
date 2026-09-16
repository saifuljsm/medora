"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveDomainAction, clearDomainAction, checkDomainDnsAction, markDomainVerifiedAction } from "@/app/(admin)/settings/domain/actions";

export function DomainSettingsForm({ currentDomain, verifiedAt }: { currentDomain: string | null; verifiedAt: string | null }) {
  const router = useRouter();
  const [domain, setDomain] = useState(currentDomain ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dnsResult, setDnsResult] = useState<string | null>(null);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveDomainAction({ domain });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleClear() {
    startTransition(async () => {
      await clearDomainAction();
      setDomain("");
      setDnsResult(null);
      router.refresh();
    });
  }

  function handleCheckDns() {
    setError(null);
    setDnsResult(null);
    startTransition(async () => {
      const result = await checkDomainDnsAction(currentDomain ?? domain);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDnsResult(result.records.join(", "));
    });
  }

  function handleMarkVerified() {
    startTransition(async () => {
      await markDomainVerifiedAction();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSave} className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-foreground">Custom domain</label>
        <div className="flex gap-2">
          <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="shop.yourdomain.com" />
          <Button type="submit" disabled={isPending}>
            Save
          </Button>
          {currentDomain && (
            <Button type="button" variant="outline" disabled={isPending} onClick={handleClear}>
              Remove
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>

      {currentDomain && (
        <div className="rounded-lg border border-border bg-card p-3.5">
          <p className="mb-2 text-xs text-muted-foreground">
            Point <b>{currentDomain}</b> at this app with a CNAME (or A record to its IP) from your domain registrar, then confirm it
            below.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleCheckDns}>
              Check DNS
            </Button>
            <Button type="button" size="sm" disabled={isPending} onClick={handleMarkVerified}>
              Mark as verified
            </Button>
            {verifiedAt ? (
              <span className="text-xs font-semibold text-success">Verified {verifiedAt}</span>
            ) : (
              <span className="text-xs font-semibold text-warning">Not verified yet</span>
            )}
          </div>
          {dnsResult && <p className="mt-2 text-xs text-muted-foreground">Resolves to: {dnsResult}</p>}
        </div>
      )}
    </div>
  );
}
