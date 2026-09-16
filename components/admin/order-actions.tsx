"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  confirmOrderByPhone,
  generatePackingSlip,
  markPackaged,
  dispatchOrder,
  markDelivered,
  markCompleted,
  cancelOrder,
} from "@/app/(admin)/orders/actions";
import type { OrderStatus } from "@prisma/client";

const CANCELABLE: OrderStatus[] = ["PENDING_PAYMENT", "CONFIRMED", "PACKAGING", "PACKAGED"];

export function OrderActions({
  orderId,
  status,
  total,
  couriers,
}: {
  orderId: string;
  status: OrderStatus;
  total: number;
  couriers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [codAmount, setCodAmount] = useState(String(total));
  const [courierId, setCourierId] = useState(couriers[0]?.id ?? "");
  const [trackingId, setTrackingId] = useState("");

  function run(action: () => Promise<{ success: true } | { success: false; error: string }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error);
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {status === "PENDING_PAYMENT" && (
        <Button disabled={isPending} onClick={() => run(() => confirmOrderByPhone(orderId))}>
          Confirm by phone
        </Button>
      )}

      {status === "CONFIRMED" && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <label className="text-xs font-semibold text-foreground">COD amount to collect</label>
          <Input type="number" min="0" step="0.01" value={codAmount} onChange={(e) => setCodAmount(e.target.value)} />
          <Button disabled={isPending} onClick={() => run(() => generatePackingSlip({ orderId, codAmount: Number(codAmount) || 0 }))}>
            Generate packing slip
          </Button>
        </div>
      )}

      {status === "PACKAGING" && (
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline">
            <a href={`/orders/${orderId}/packing-slip`} target="_blank" rel="noopener noreferrer">
              View / print packing slip
            </a>
          </Button>
          <Button disabled={isPending} onClick={() => run(() => markPackaged(orderId))}>
            Mark packaged
          </Button>
        </div>
      )}

      {status === "PACKAGED" && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <label className="text-xs font-semibold text-foreground">Courier</label>
          <select
            value={courierId}
            onChange={(e) => setCourierId(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {couriers.length === 0 && <option value="">No couriers yet — add one first</option>}
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="text-xs font-semibold text-foreground">Tracking ID (optional)</label>
          <Input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} />
          <Button
            disabled={isPending || !courierId}
            onClick={() => run(() => dispatchOrder({ orderId, courierId, trackingId, fee: 0 }))}
          >
            Dispatch
          </Button>
        </div>
      )}

      {status === "DELIVERING" && (
        <Button disabled={isPending} onClick={() => run(() => markDelivered(orderId))}>
          Mark delivered
        </Button>
      )}

      {status === "DELIVERED" && (
        <Button disabled={isPending} onClick={() => run(() => markCompleted(orderId))}>
          Mark completed
        </Button>
      )}

      {CANCELABLE.includes(status) && (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => {
            if (confirm("Cancel this order and restore its stock?")) run(() => cancelOrder(orderId));
          }}
          className="border-destructive text-destructive hover:bg-destructive/10"
        >
          Cancel order
        </Button>
      )}

      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}
