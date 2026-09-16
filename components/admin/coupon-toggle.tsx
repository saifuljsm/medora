"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleCouponActiveAction } from "@/app/(admin)/coupons/actions";

export function CouponToggle({ couponId, active }: { couponId: string; active: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await toggleCouponActiveAction(couponId, !active);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${active ? "bg-success-tint text-success" : "bg-muted text-muted-foreground"}`}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}
