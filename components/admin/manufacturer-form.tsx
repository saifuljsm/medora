"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createManufacturerAction } from "@/app/(admin)/products/reference-data/actions";

export function ManufacturerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createManufacturerAction({ name, country: country || undefined });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setError(null);
      setName("");
      setCountry("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Square Pharmaceuticals" required />
        <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country (optional)" className="w-40" />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
