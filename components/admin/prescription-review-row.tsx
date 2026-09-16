"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reviewPrescriptionAction } from "@/app/(admin)/prescriptions/actions";

export function PrescriptionReviewRow({
  id,
  imageUrl,
  customerName,
  customerPhone,
  createdAt,
}: {
  id: string;
  imageUrl: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
}) {
  const [isPending, startTransition] = useTransition();

  function decide(decision: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      await reviewPrescriptionAction({ prescriptionId: id, decision });
    });
  }

  return (
    <div className={`flex items-center gap-4 border-b border-border py-3 ${isPending ? "opacity-50" : ""}`}>
      <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Prescription" className="h-16 w-16 rounded-lg border border-border object-cover" />
      </a>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{customerName || "Unnamed customer"}</p>
        <p className="text-xs text-muted-foreground">{customerPhone}</p>
        <p className="text-[11px] text-muted-text">{createdAt}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => decide("REJECTED")}>
          Reject
        </Button>
        <Button size="sm" disabled={isPending} onClick={() => decide("APPROVED")}>
          Approve
        </Button>
      </div>
    </div>
  );
}
