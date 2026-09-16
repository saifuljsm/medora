"use client";

import { useState } from "react";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPurchaseOrder } from "@/app/(admin)/purchasing/orders/actions";

interface ProductOption {
  id: string;
  label: string;
  unitsPerPack: number | null;
  unitLabel: string | null;
  packLabel: string | null;
}

const ItemSchema = z.object({
  productId: z.string().min(1, "Pick a product"),
  unit: z.enum(["PIECE", "PACK"]),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitCost: z.coerce.number().positive("Cost must be positive"),
});

const FormSchema = z.object({
  supplierId: z.string().min(1, "Pick a supplier"),
  branchId: z.string().min(1, "Pick a branch"),
  items: z.array(ItemSchema).min(1, "Add at least one item"),
});

type FormInput = z.input<typeof FormSchema>;
type FormValues = z.infer<typeof FormSchema>;

export function PurchaseOrderForm({
  suppliers,
  branches,
  products,
}: {
  suppliers: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  products: ProductOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      supplierId: suppliers[0]?.id ?? "",
      branchId: branches[0]?.id ?? "",
      items: [{ productId: "", unit: "PACK", quantity: 1, unitCost: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");

  async function onSubmit(values: FormValues) {
    setError(null);
    setIsSubmitting(true);
    const result = await createPurchaseOrder(values);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/purchasing/orders/${result.id}/receive`);
  }

  function productLabelFor(productId: string) {
    return products.find((p) => p.id === productId);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {error && (
        <div className="rounded-md border border-destructive bg-destructive-tint px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Supplier</label>
          <Controller
            control={control}
            name="supplierId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.supplierId && <p className="text-xs text-destructive">{errors.supplierId.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Branch</label>
          <Controller
            control={control}
            name="branchId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Items</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ productId: "", unit: "PACK", quantity: 1, unitCost: 0 })}
          >
            + Add item
          </Button>
        </div>

        {fields.map((field, index) => {
          const product = productLabelFor(items[index]?.productId);
          const unit = items[index]?.unit;
          return (
            <div key={field.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-end gap-2 rounded-md border border-border p-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Product</label>
                <Controller
                  control={control}
                  name={`items.${index}.productId`}
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
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Unit</label>
                <Controller
                  control={control}
                  name={`items.${index}.unit`}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PACK">{product?.packLabel || "Pack"}</SelectItem>
                        <SelectItem value="PIECE">{product?.unitLabel || "Piece"}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Quantity</label>
                <Input type="number" step="1" min="1" {...register(`items.${index}.quantity`)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Cost / {unit === "PIECE" ? product?.unitLabel || "piece" : product?.packLabel || "pack"}
                </label>
                <Input type="number" step="0.01" min="0" {...register(`items.${index}.unitCost`)} />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} disabled={fields.length === 1}>
                Remove
              </Button>
            </div>
          );
        })}
        {errors.items?.message && <p className="text-xs text-destructive">{errors.items.message}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Creating…" : "Create purchase order"}
      </Button>
    </form>
  );
}
