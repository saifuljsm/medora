"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createQuickStockEntry, type QuickEntryInput } from "@/app/(admin)/purchasing/quick-entry/actions";

export function QuickEntryForm({ branchId, products }: { branchId: string; products: Array<{ id: string; label: string }> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, control, handleSubmit, reset } = useForm<QuickEntryInput>({
    defaultValues: { branchId, productId: "", batchNumber: "", expiryDate: "", quantity: 1, purchasePrice: 0, sellingPrice: 0 },
  });

  async function onSubmit(values: QuickEntryInput) {
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);
    const result = await createQuickStockEntry(values);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    reset({ branchId, productId: "", batchNumber: "", expiryDate: "", quantity: 1, purchasePrice: 0, sellingPrice: 0 });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Add stock directly</h2>
      <p className="text-xs text-muted-foreground">
        For stock that didn&apos;t come through a purchase order — quantity is in base units (tablets, vials, bottles).
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-mint-dark">Stock added.</p>}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Product</label>
        <Controller
          control={control}
          name="productId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Batch number</label>
        <Input {...register("batchNumber")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Expiry date</label>
        <Input type="date" {...register("expiryDate")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Quantity (base units)</label>
        <Input type="number" step="1" min="1" {...register("quantity")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Purchase price / base unit</label>
        <Input type="number" step="0.01" min="0" {...register("purchasePrice")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Selling price / base unit</label>
        <Input type="number" step="0.01" min="0" {...register("sellingPrice")} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Add stock"}
      </Button>
    </form>
  );
}
