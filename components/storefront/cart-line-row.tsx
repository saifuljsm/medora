"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Pill, Trash2 } from "lucide-react";
import { updateCartQuantityAction, removeFromCartAction } from "@/app/(storefront)/cart/actions";
import type { HydratedCartLine } from "@/lib/cart";

export function CartLineRow({ line }: { line: HydratedCartLine }) {
  const [isPending, startTransition] = useTransition();
  const href = line.slug ? `/medicines/${line.slug}` : "#";

  function setQuantity(quantity: number) {
    startTransition(async () => {
      await updateCartQuantityAction({ productId: line.productId, saleUnit: line.saleUnit, quantity });
    });
  }

  function remove() {
    startTransition(async () => {
      await removeFromCartAction(line.productId, line.saleUnit);
    });
  }

  return (
    <div className={`flex gap-3 border-b border-border py-3.5 ${isPending ? "opacity-50" : ""}`}>
      <Link href={href} className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-tint">
        {line.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={line.image} alt={line.brandName} className="h-full w-full object-cover" />
        ) : (
          <Pill className="h-6 w-6 text-primary" strokeWidth={1.6} />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={href} className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-foreground">{line.brandName}</p>
            <p className="truncate text-[11px] text-muted-text">{line.genericLabel}</p>
          </Link>
          <button type="button" onClick={remove} className="shrink-0 p-1 text-muted-text hover:text-destructive" aria-label="Remove">
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {line.insufficientStock && (
          <p className="text-[10.5px] font-semibold text-destructive">Only {line.stock} left — reduce quantity</p>
        )}
        {line.requiresPrescription && <p className="text-[10.5px] font-semibold text-warning">Prescription required</p>}

        <div className="mt-0.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 rounded-lg border border-border-strong px-1 py-0.5">
            <button
              type="button"
              onClick={() => setQuantity(line.quantity - 1)}
              disabled={isPending}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-tint text-base font-bold text-primary"
            >
              −
            </button>
            <span className="min-w-4 text-center text-[13px] font-semibold text-foreground">{line.quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(line.quantity + 1)}
              disabled={isPending}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-tint text-base font-bold text-primary"
            >
              +
            </button>
          </div>
          <span className="text-sm font-bold text-primary">৳{line.lineTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
