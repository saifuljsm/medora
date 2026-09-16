"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { reconcileCash, type ReconcileInput } from "@/app/(admin)/reconciliation/actions";

export function CashReconciliationForm({ branchId }: { branchId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, reset } = useForm<ReconcileInput>({
    defaultValues: {
      branchId,
      date: new Date().toISOString().slice(0, 10),
      openingFloat: 0,
      countedCash: 0,
      notes: "",
    },
  });

  async function onSubmit(values: ReconcileInput) {
    setError(null);
    setIsSubmitting(true);
    const result = await reconcileCash(values);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    reset({ branchId, date: values.date, openingFloat: 0, countedCash: 0, notes: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Reconcile a day</h2>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input type="hidden" {...register("branchId")} />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Date</label>
        <Input type="date" {...register("date")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Opening float</label>
        <Input type="number" step="0.01" min="0" {...register("openingFloat")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Counted cash (till count)</label>
        <Input type="number" step="0.01" min="0" {...register("countedCash")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Notes</label>
        <Input {...register("notes")} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save reconciliation"}
      </Button>
    </form>
  );
}
