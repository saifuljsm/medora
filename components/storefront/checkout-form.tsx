"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createOnlineSale } from "@/app/(storefront)/checkout/actions";

export function CheckoutForm({ requiresPrescription }: { requiresPrescription: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    division: "",
    district: "Kushtia",
    upazila: "",
    line1: "",
    line2: "",
    postCode: "",
    couponCode: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createOnlineSale(form);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/order-confirmation/${result.saleId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-[12.5px] font-semibold text-foreground">Full name</label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-[12.5px] font-semibold text-foreground">Phone number</label>
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01XXXXXXXXX" required />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-[12.5px] font-semibold text-foreground">Email (optional)</label>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
      </div>

      <div className="mt-1 border-t border-border pt-3.5">
        <p className="mb-2.5 text-[13px] font-bold text-foreground">Delivery address</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-foreground">Division</label>
            <Input value={form.division} onChange={(e) => set("division", e.target.value)} placeholder="Khulna" required />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-foreground">District</label>
            <Input value={form.district} onChange={(e) => set("district", e.target.value)} placeholder="Kushtia" required />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-[12.5px] font-semibold text-foreground">Upazila</label>
            <Input value={form.upazila} onChange={(e) => set("upazila", e.target.value)} required />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-[12.5px] font-semibold text-foreground">Street address</label>
            <Input value={form.line1} onChange={(e) => set("line1", e.target.value)} placeholder="House, road, area" required />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-[12.5px] font-semibold text-foreground">Landmark (optional)</label>
            <Input value={form.line2} onChange={(e) => set("line2", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-semibold text-foreground">Post code (optional)</label>
            <Input value={form.postCode} onChange={(e) => set("postCode", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="mt-1 border-t border-border pt-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-foreground">Coupon code (optional)</label>
        <Input
          value={form.couponCode}
          onChange={(e) => set("couponCode", e.target.value.toUpperCase())}
          placeholder="e.g. WELCOME10"
        />
      </div>

      {requiresPrescription && (
        <div className="rounded-lg border border-warning bg-warning-tint px-3 py-2.5 text-xs font-semibold text-warning">
          Your cart includes a prescription item. Make sure you&apos;ve already uploaded it via{" "}
          <a href="/prescription-order" className="underline">
            Upload prescription
          </a>{" "}
          and it&apos;s been approved — otherwise this order will be rejected.
        </div>
      )}

      <div className="rounded-lg border border-border bg-primary-tint px-3 py-2.5 text-xs font-semibold text-foreground">
        Payment: Cash on Delivery only. Pay when your order arrives.
      </div>

      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="mt-1 h-11 w-full bg-mint text-white hover:bg-mint-dark">
        {isPending ? "Placing order…" : "Place order"}
      </Button>
    </form>
  );
}
