"use client";

import { useState } from "react";

// TODO(Phase 2.4): wire to the real Redis-backed cart. For now this is an
// honest placeholder (matches the one on the product detail page) rather
// than a fake success state — stopPropagation keeps the click from also
// triggering the card's own Link navigation to the product page.
export function AddToCartButton({ productId, disabled = false }: { productId: string; disabled?: boolean }) {
  const [justClicked, setJustClicked] = useState(false);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setJustClicked(true);
    setTimeout(() => setJustClicked(false), 1500);
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
      data-product-id={productId}
      className="mt-2 flex h-8 w-full items-center justify-center rounded-lg bg-mint text-[12.5px] font-bold text-white transition-colors hover:bg-mint-dark"
    >
      {justClicked ? "Coming soon" : "+ Add to cart"}
    </button>
  );
}
