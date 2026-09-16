"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStockAdjustment, type StockAdjustmentInput } from "@/app/(admin)/inventory/adjustments/actions";

const REASONS = ["DAMAGED", "EXPIRED", "LOST", "THEFT", "OTHER"] as const;

interface BatchOption {
  id: string;
  label: string;
  quantity: number;
}

export function StockAdjustmentForm({ batches }: { batches: BatchOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, control, handleSubmit, reset, watch } = useForm<StockAdjustmentInput>({
    defaultValues: { batchId: "", quantity: 1, reason: "DAMAGED", note: "" },
  });
  const selectedBatch = batches.find((b) => b.id === watch("batchId"));

  async function onSubmit(values: StockAdjustmentInput) {
    setError(null);
    setIsSubmitting(true);
    const result = await createStockAdjustment(values);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    reset({ batchId: "", quantity: 1, reason: "DAMAGED", note: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">New write-off</h2>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Batch</label>
        <Controller
          control={control}
          name="batchId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select batch" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.label} ({b.quantity} in stock)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Quantity to write off{selectedBatch ? ` (max ${selectedBatch.quantity})` : ""}</label>
        <Input type="number" step="1" min="1" max={selectedBatch?.quantity} {...register("quantity")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Reason</label>
        <Controller
          control={control}
          name="reason"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Note</label>
        <Input {...register("note")} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Record write-off"}
      </Button>
    </form>
  );
}
