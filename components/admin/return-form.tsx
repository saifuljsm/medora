"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { findSaleByInvoiceNumber, createReturn, type SaleForReturn } from "@/app/(admin)/returns/actions";

const REFUND_METHODS = ["CASH", "MOBILE_BANKING", "STORE_CREDIT"] as const;
const WRITE_OFF_REASONS = ["DAMAGED", "EXPIRED", "LOST", "THEFT", "OTHER"] as const;

interface LineState {
  include: boolean;
  quantity: number;
  restock: boolean;
  writeOffReason: (typeof WRITE_OFF_REASONS)[number];
}

export function ReturnForm() {
  const router = useRouter();
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [sale, setSale] = useState<SaleForReturn | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lines, setLines] = useState<Record<string, LineState>>({});
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<(typeof REFUND_METHODS)[number]>("CASH");
  const [refundAmount, setRefundAmount] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLookup() {
    setLookupError(null);
    setSuccess(false);
    const result = await findSaleByInvoiceNumber(invoiceNumber);
    if ("error" in result) {
      setSale(null);
      setLookupError(result.error);
      return;
    }
    setSale(result);
    setLines(
      Object.fromEntries(
        result.items.map((item) => [
          item.saleItemId,
          { include: false, quantity: item.quantity - item.alreadyReturned, restock: true, writeOffReason: "OTHER" as const },
        ]),
      ),
    );
    setRefundAmount("0");
  }

  function updateLine(saleItemId: string, patch: Partial<LineState>) {
    setLines((prev) => ({ ...prev, [saleItemId]: { ...prev[saleItemId], ...patch } }));
  }

  function suggestRefund() {
    if (!sale) return;
    const total = sale.items.reduce((sum, item) => {
      const line = lines[item.saleItemId];
      if (!line?.include) return sum;
      return sum + item.unitPrice * line.quantity;
    }, 0);
    setRefundAmount(total.toFixed(2));
  }

  async function handleSubmit() {
    if (!sale) return;
    setError(null);
    const items = Object.entries(lines)
      .filter(([, line]) => line.include)
      .map(([saleItemId, line]) => ({
        saleItemId,
        quantity: line.quantity,
        restock: line.restock,
        writeOffReason: line.restock ? undefined : line.writeOffReason,
      }));

    if (items.length === 0) {
      setError("Select at least one item to return");
      return;
    }
    if (!reason.trim()) {
      setError("Enter a reason for the return");
      return;
    }

    setIsSubmitting(true);
    const result = await createReturn({
      saleId: sale.saleId,
      reason: reason.trim(),
      refundMethod,
      refundAmount: Number(refundAmount) || 0,
      items,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setSale(null);
    setInvoiceNumber("");
    setReason("");
    setRefundAmount("0");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {success && <div className="rounded-md border border-mint bg-mint-tint px-3 py-2 text-sm text-mint-dark">Return processed.</div>}

      <div className="flex gap-2">
        <Input placeholder="Invoice number (e.g. POS-2026-000123)" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        <Button type="button" onClick={handleLookup}>
          Find sale
        </Button>
      </div>
      {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}

      {sale && (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground">Invoice {sale.invoiceNumber}</h3>
          {sale.items.map((item) => {
            const line = lines[item.saleItemId];
            const returnable = item.quantity - item.alreadyReturned;
            if (returnable <= 0) {
              return (
                <div key={item.saleItemId} className="text-xs text-muted-foreground">
                  {item.productName} — fully returned already
                </div>
              );
            }
            return (
              <div key={item.saleItemId} className="flex flex-col gap-2 border-b border-border pb-3 last:border-b-0">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={line?.include ?? false}
                    onChange={(e) => updateLine(item.saleItemId, { include: e.target.checked })}
                  />
                  <span className="text-sm font-medium text-foreground">{item.productName}</span>
                  <span className="text-xs text-muted-foreground">
                    sold {item.quantity}, returnable {returnable}
                  </span>
                </div>
                {line?.include && (
                  <div className="ml-6 flex flex-wrap items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Quantity</label>
                      <Input
                        type="number"
                        min={1}
                        max={returnable}
                        className="w-20"
                        value={line.quantity}
                        onChange={(e) => updateLine(item.saleItemId, { quantity: Math.min(returnable, Math.max(1, Number(e.target.value) || 1)) })}
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={line.restock}
                        onChange={(e) => updateLine(item.saleItemId, { restock: e.target.checked })}
                      />
                      Restock (put back on shelf)
                    </label>
                    {!line.restock && (
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Write-off reason</label>
                        <Select value={line.writeOffReason} onValueChange={(v) => updateLine(item.saleItemId, { writeOffReason: v as LineState["writeOffReason"] })}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WRITE_OFF_REASONS.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Reason for return</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Refund method</label>
              <Select value={refundMethod} onValueChange={(v) => setRefundMethod(v as typeof refundMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Refund amount</label>
              <div className="flex gap-1">
                <Input type="number" step="0.01" min="0" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
                <Button type="button" variant="outline" size="sm" onClick={suggestRefund}>
                  Suggest
                </Button>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing…" : "Process return"}
          </Button>
        </div>
      )}
    </div>
  );
}
