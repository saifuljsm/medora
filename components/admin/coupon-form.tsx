"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCouponAction } from "@/app/(admin)/coupons/actions";

export function CouponForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    value: "",
    minOrderAmount: "",
    usageLimit: "",
    expiresAt: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCouponAction({
        code: form.code,
        discountType: form.discountType,
        value: Number(form.value),
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        expiresAt: form.expiresAt || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setForm({ code: "", discountType: "PERCENTAGE", value: "", minOrderAmount: "", usageLimit: "", expiresAt: "" });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4">
      <div className="col-span-2">
        <label className="mb-1 block text-xs font-semibold text-foreground">Code</label>
        <Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="WELCOME10" required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">Type</label>
        <select
          value={form.discountType}
          onChange={(e) => set("discountType", e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="PERCENTAGE">Percentage</option>
          <option value="FIXED">Fixed amount</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">Value</label>
        <Input type="number" min="0" step="0.01" value={form.value} onChange={(e) => set("value", e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">Min order amount (optional)</label>
        <Input type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={(e) => set("minOrderAmount", e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-foreground">Usage limit (optional)</label>
        <Input type="number" min="1" step="1" value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} />
      </div>
      <div className="col-span-2">
        <label className="mb-1 block text-xs font-semibold text-foreground">Expires (optional)</label>
        <Input type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
      </div>
      {error && <p className="col-span-2 text-xs font-semibold text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="col-span-2">
        {isPending ? "Creating…" : "Create coupon"}
      </Button>
    </form>
  );
}
