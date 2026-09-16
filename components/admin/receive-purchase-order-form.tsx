"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { receivePurchaseOrder } from "@/app/(admin)/purchasing/orders/[id]/receive/actions";

interface ReceiveItem {
  id: string;
  productLabel: string;
  unit: "PIECE" | "PACK";
  unitLabel: string;
  unitsPerPack: number | null;
  orderedQuantity: number;
  unitCost: number;
  alreadyReceived: boolean;
  receivedBatchNumber: string | null;
  receivedBaseUnits: number | null;
  suggestedSellingPrice: number | null;
}

interface FormValues {
  lines: Record<
    string,
    {
      include: boolean;
      batchNumber: string;
      expiryDate: string;
      receivedQuantity: number;
      sellingPrice: number;
    }
  >;
}

function LineConversionPreview({ unit, unitsPerPack, quantity }: { unit: "PIECE" | "PACK"; unitsPerPack: number | null; quantity: number }) {
  if (unit === "PIECE") return <span>{quantity || 0} base unit(s)</span>;
  if (!unitsPerPack) return <span className="text-destructive">unitsPerPack not set on this product</span>;
  return (
    <span>
      {quantity || 0} × {unitsPerPack} = <b>{(quantity || 0) * unitsPerPack} base unit(s)</b>
    </span>
  );
}

export function ReceivePurchaseOrderForm({
  purchaseOrderId,
  items,
  disabled,
}: {
  purchaseOrderId: string;
  items: ReceiveItem[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingItems = items.filter((item) => !item.alreadyReceived);

  const { register, control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      lines: Object.fromEntries(
        pendingItems.map((item) => [
          item.id,
          {
            include: true,
            batchNumber: "",
            expiryDate: "",
            receivedQuantity: item.orderedQuantity,
            sellingPrice: item.suggestedSellingPrice ?? 0,
          },
        ]),
      ),
    },
  });
  const watchedLines = useWatch({ control, name: "lines" });

  async function onSubmit(values: FormValues) {
    setError(null);
    const lines = pendingItems
      .filter((item) => values.lines[item.id]?.include)
      .map((item) => ({
        purchaseOrderItemId: item.id,
        batchNumber: values.lines[item.id].batchNumber,
        expiryDate: values.lines[item.id].expiryDate,
        receivedQuantity: values.lines[item.id].receivedQuantity,
        sellingPrice: values.lines[item.id].sellingPrice,
      }));

    if (lines.length === 0) {
      setError("Select at least one line to receive");
      return;
    }

    setIsSubmitting(true);
    const result = await receivePurchaseOrder({ purchaseOrderId, lines });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {items
        .filter((item) => item.alreadyReceived)
        .map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-md border border-border bg-muted p-3 text-sm">
            <span>{item.productLabel}</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>
                Batch {item.receivedBatchNumber} — {item.receivedBaseUnits} base units
              </span>
              <Badge variant="secondary">Received</Badge>
            </div>
          </div>
        ))}

      {!disabled && pendingItems.length > 0 && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md border border-destructive bg-destructive-tint px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {pendingItems.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-md border border-border p-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" {...register(`lines.${item.id}.include`)} className="h-4 w-4" />
                <span className="font-medium text-foreground">{item.productLabel}</span>
                <span className="text-xs text-muted-foreground">
                  ordered {item.orderedQuantity} {item.unitLabel}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Batch number</label>
                  <Input {...register(`lines.${item.id}.batchNumber`)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Expiry date</label>
                  <Input type="date" {...register(`lines.${item.id}.expiryDate`)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Received ({item.unitLabel})</label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max={item.orderedQuantity}
                    {...register(`lines.${item.id}.receivedQuantity`)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Selling price / base unit</label>
                  <Input type="number" step="0.01" min="0" {...register(`lines.${item.id}.sellingPrice`)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <LineConversionPreview
                  unit={item.unit}
                  unitsPerPack={item.unitsPerPack}
                  quantity={Number(watchedLines?.[item.id]?.receivedQuantity ?? item.orderedQuantity)}
                />
                {" · "}
                {watchedLines?.[item.id]?.receivedQuantity != null &&
                  Number(watchedLines[item.id].receivedQuantity) < item.orderedQuantity && (
                    <span className="font-medium text-warning">short shipment — order will be marked partially received</span>
                  )}
              </p>
            </div>
          ))}
          <Button type="submit" disabled={isSubmitting} className="self-start">
            {isSubmitting ? "Receiving…" : "Receive selected lines"}
          </Button>
        </form>
      )}

      {pendingItems.length === 0 && <p className="text-sm text-muted-foreground">All lines have been received.</p>}
    </div>
  );
}
