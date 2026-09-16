"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/app/(storefront)/cart/actions";

interface UnitOption {
  unit: "PIECE" | "PACK";
  label: string;
  price: number;
}

export function ProductDetailActions({ productId, options }: { productId: string; options: UnitOption[] }) {
  const [selected, setSelected] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const option = options[selected];
  const lineTotal = option.price * quantity;

  function handleAddToCart() {
    startTransition(async () => {
      await addToCartAction({ productId, saleUnit: option.unit, quantity });
      setMessage("Added to cart.");
      setTimeout(() => setMessage(null), 2000);
    });
  }

  return (
    <>
      <div className="my-3.5 flex gap-2">
        {options.map((opt, i) => (
          <button
            key={opt.unit}
            type="button"
            onClick={() => setSelected(i)}
            className={`flex min-h-11 flex-1 flex-col justify-center rounded-lg border-[1.5px] px-2.5 py-2.5 text-center text-[13px] font-semibold transition-colors ${
              i === selected
                ? "border-primary bg-primary-tint text-primary"
                : "border-border text-muted-foreground hover:border-border-strong hover:bg-accent"
            }`}
          >
            {opt.label}
            <small className="text-[10.5px] font-medium opacity-80">৳{opt.price.toFixed(2)}</small>
          </button>
        ))}
      </div>

      <div className="my-3.5 flex items-center justify-between">
        <p className="text-[13.5px] font-semibold text-foreground">Quantity</p>
        <div className="flex items-center gap-3.5 rounded-lg border border-border-strong px-1.5 py-1">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-tint text-lg font-bold text-primary"
          >
            −
          </button>
          <span className="text-sm font-semibold text-foreground">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-tint text-lg font-bold text-primary"
          >
            +
          </button>
        </div>
      </div>

      {message && <p className="mb-2 text-xs text-muted-foreground">{message}</p>}

      <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 flex items-center gap-2.5 border-t border-border bg-card p-4 pb-[calc(12px+env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:mb-0 lg:mt-6 lg:rounded-xl lg:border lg:p-4">
        <div className="shrink-0 text-base font-bold text-foreground">৳{lineTotal.toFixed(2)}</div>
        <Button
          onClick={handleAddToCart}
          disabled={isPending}
          className="flex-1 bg-mint text-white hover:bg-mint/90"
          data-product-id={productId}
        >
          {isPending ? "Adding…" : "Add to cart"}
        </Button>
      </div>
    </>
  );
}
