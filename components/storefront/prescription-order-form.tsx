"use client";

import { useState, useTransition } from "react";
import { FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrescriptionUpload } from "@/components/storefront/prescription-upload";
import { submitPrescriptionAction } from "@/app/(storefront)/prescription-order/actions";

export function PrescriptionOrderForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrl) {
      setError("Please upload a photo of your prescription first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitPrescriptionAction({ name, imageUrl });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-success bg-success-tint px-4 py-8 text-center">
        <FileCheck2 className="h-8 w-8 text-success" strokeWidth={1.8} />
        <p className="text-sm font-semibold text-foreground">Prescription received</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Our pharmacist will review it shortly. Track its status any time from{" "}
          <a href="/account" className="font-semibold text-primary underline">
            your account
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div>
        <label className="mb-1 block text-[12.5px] font-semibold text-foreground">Your name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Abdul Karim" required />
      </div>
      <div>
        <label className="mb-1 block text-[12.5px] font-semibold text-foreground">Prescription photo</label>
        <PrescriptionUpload onUploaded={setImageUrl} />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="mt-1 h-11 w-full bg-mint text-white hover:bg-mint-dark">
        {isPending ? "Submitting…" : "Submit for review"}
      </Button>
    </form>
  );
}
