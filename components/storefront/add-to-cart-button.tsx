"use client";

import { useState, useTransition } from "react";
import { addToCartAction } from "@/app/(storefront)/cart/actions";

// stopPropagation keeps the click from also triggering the card's own Link
// navigation to the product page.
export function AddToCartButton({
  productId,
  saleUnit,
  disabled = false,
}: {
  productId: string;
  saleUnit: "PIECE" | "PACK";
  disabled?: boolean;
}) {
  const [added, setAdded] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await addToCartAction({ productId, saleUnit, quantity: 1 });
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    });
  }

  if (disabled) {
    return (
      <span className="mt-2 flex h-8 w-full cursor-not-allowed items-center justify-center rounded-lg bg-muted text-[12.5px] font-bold text-muted-text">
        Out of stock
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      data-product-id={productId}
      className="mt-2 flex h-8 w-full items-center justify-center rounded-lg bg-mint text-[12.5px] font-bold text-white transition-colors hover:bg-mint-dark disabled:opacity-70"
    >
      {added ? "Added ✓" : isPending ? "Adding…" : "+ Add to cart"}
    </button>
  );
}
