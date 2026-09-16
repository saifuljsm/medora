"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPosSale, type CreatePosSaleResult } from "@/app/(admin)/pos/actions";
import { createAndApprovePrescriptionForPos } from "@/app/(admin)/pos/prescription-actions";
import { ImageUpload } from "@/components/admin/image-upload";

interface PosProduct {
  id: string;
  brandName: string;
  genericLabel: string;
  barcode: string | null;
  requiresPrescription: boolean;
  sellsByUnit: boolean;
  unitLabel: string | null;
  unitPrice: number | null;
  unitsPerPack: number | null;
  packLabel: string | null;
  packPrice: number | null;
  defaultMrp: number | null;
  vatRate: number | null;
  stock: number;
}

interface CartLine {
  productId: string;
  saleUnit: "PIECE" | "PACK";
  quantity: number;
}

function lineUnitPrice(product: PosProduct, saleUnit: "PIECE" | "PACK"): number | null {
  if (!product.sellsByUnit) return product.defaultMrp;
  if (saleUnit === "PACK") return product.packPrice;
  return product.unitPrice;
}

function lineLabel(product: PosProduct, saleUnit: "PIECE" | "PACK"): string {
  if (!product.sellsByUnit) return "item";
  return saleUnit === "PACK" ? product.packLabel || "pack" : product.unitLabel || "piece";
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "MOBILE_BANKING", label: "Mobile banking" },
  { value: "DUE", label: "Due (pay later)" },
] as const;

export function PosTerminal({ branchId, products }: { branchId: string; products: PosProduct[] }) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]["value"]>("CASH");
  const [cashTendered, setCashTendered] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ invoiceNumber: string; total: number } | null>(null);

  const [prescriptionImageUrl, setPrescriptionImageUrl] = useState("");
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [prescriptionError, setPrescriptionError] = useState<string | null>(null);
  const [isApprovingPrescription, setIsApprovingPrescription] = useState(false);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const hasRxItems = cart.some((line) => productsById.get(line.productId)?.requiresPrescription);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return products
      .filter(
        (p) =>
          p.brandName.toLowerCase().includes(q) ||
          p.genericLabel.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)),
      )
      .slice(0, 20);
  }, [products, query]);

  function addToCart(product: PosProduct) {
    setReceipt(null);
    setCart((prev) => {
      const defaultUnit: "PIECE" | "PACK" = product.sellsByUnit ? "PIECE" : "PACK";
      const existing = prev.find((l) => l.productId === product.id && l.saleUnit === defaultUnit);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId: product.id, saleUnit: defaultUnit, quantity: 1 }];
    });
    setQuery("");
  }

  function updateLine(index: number, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLine(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = cart.reduce((sum, line) => {
    const product = productsById.get(line.productId);
    if (!product) return sum;
    const unitPrice = lineUnitPrice(product, line.saleUnit) ?? 0;
    return sum + unitPrice * line.quantity;
  }, 0);

  const taxAmount = cart.reduce((sum, line) => {
    const product = productsById.get(line.productId);
    if (!product || !product.vatRate) return sum;
    const unitPrice = lineUnitPrice(product, line.saleUnit) ?? 0;
    return sum + (unitPrice * line.quantity * product.vatRate) / 100;
  }, 0);

  const total = subtotal + taxAmount;
  const tendered = Number(cashTendered) || 0;
  const change = paymentMethod === "CASH" ? Math.max(0, tendered - total) : 0;

  async function handleApprovePrescription() {
    setPrescriptionError(null);
    if (!prescriptionImageUrl.trim()) {
      setPrescriptionError("Enter a prescription photo link");
      return;
    }
    setIsApprovingPrescription(true);
    const result = await createAndApprovePrescriptionForPos({
      imageUrl: prescriptionImageUrl.trim(),
      branchId,
    });
    setIsApprovingPrescription(false);
    if (!result.success) {
      setPrescriptionError(result.error);
      return;
    }
    setPrescriptionId(result.prescriptionId);
  }

  async function handleSubmit() {
    setError(null);
    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }
    if (hasRxItems && !prescriptionId) {
      setError("Attach an approved prescription before completing this sale");
      return;
    }
    if (paymentMethod === "CASH" && tendered < total) {
      setError("Cash tendered is less than the total");
      return;
    }

    setIsSubmitting(true);
    const result: CreatePosSaleResult = await createPosSale({
      branchId,
      paymentMethod,
      customerPhone: customerPhone.trim() || undefined,
      customerName: customerName.trim() || undefined,
      prescriptionId: hasRxItems ? prescriptionId ?? undefined : undefined,
      items: cart.map((l) => ({ productId: l.productId, saleUnit: l.saleUnit, quantity: l.quantity })),
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setReceipt({ invoiceNumber: result.invoiceNumber, total: result.total });
    setCart([]);
    setCustomerPhone("");
    setCustomerName("");
    setCashTendered("");
    setPrescriptionId(null);
    setPrescriptionImageUrl("");
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-3">
        <Input
          placeholder="Search brand, generic name, or scan barcode…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {results.length > 0 && (
          <div className="flex flex-col gap-1 rounded-md border border-border">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                className="flex items-center justify-between border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent"
              >
                <div>
                  <div className="font-medium text-foreground">{p.brandName}</div>
                  <div className="text-xs text-muted-foreground">{p.genericLabel}</div>
                </div>
                <div className="flex items-center gap-2">
                  {p.requiresPrescription && (
                    <Badge variant="outline" className="border-warning text-warning">
                      Rx
                    </Badge>
                  )}
                  <span className={p.stock > 0 ? "text-xs text-mint-dark" : "text-xs text-destructive"}>
                    {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">Cart</h2>
          {cart.length === 0 && <p className="text-sm text-muted-foreground">No items yet — search above to add.</p>}
          {cart.map((line, index) => {
            const product = productsById.get(line.productId);
            if (!product) return null;
            const unitPrice = lineUnitPrice(product, line.saleUnit) ?? 0;
            return (
              <div key={`${line.productId}-${line.saleUnit}-${index}`} className="flex items-center gap-2 rounded-md border border-border p-2">
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{product.brandName}</div>
                  <div className="text-xs text-muted-foreground">
                    ৳{unitPrice.toFixed(2)} / {lineLabel(product, line.saleUnit)}
                  </div>
                </div>
                {product.sellsByUnit && (
                  <Select value={line.saleUnit} onValueChange={(v) => updateLine(index, { saleUnit: v as "PIECE" | "PACK" })}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIECE">{product.unitLabel || "Piece"}</SelectItem>
                      <SelectItem value="PACK">{product.packLabel || "Pack"}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Input
                  type="number"
                  min="1"
                  step="1"
                  className="w-16"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                />
                <span className="w-20 text-right text-sm font-semibold">৳{(unitPrice * line.quantity).toFixed(2)}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(index)}>
                  ✕
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        {error && <div className="rounded-md border border-destructive bg-destructive-tint px-3 py-2 text-sm text-destructive">{error}</div>}
        {receipt && (
          <div className="rounded-md border border-mint bg-mint-tint px-3 py-2 text-sm text-mint-dark">
            Sale complete — invoice <b>{receipt.invoiceNumber}</b>, total ৳{receipt.total.toFixed(2)}
          </div>
        )}

        {hasRxItems && (
          <div className="flex flex-col gap-2 rounded-md border border-warning bg-warning-tint p-3">
            <p className="text-sm font-semibold text-warning">Prescription required</p>
            {prescriptionId ? (
              <p className="text-sm text-mint-dark">Approved and attached — ready to complete this sale.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  A pharmacist (or the owner) must review the paper prescription and approve it here before this
                  sale can be completed.
                </p>
                {prescriptionError && <p className="text-xs text-destructive">{prescriptionError}</p>}
                {prescriptionImageUrl ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-mint-dark">Photo uploaded.</span>
                    <Button type="button" size="sm" onClick={handleApprovePrescription} disabled={isApprovingPrescription}>
                      {isApprovingPrescription ? "Approving…" : "Approve & attach"}
                    </Button>
                  </div>
                ) : (
                  <ImageUpload purpose="prescription-photo" label="Take/upload photo" onUploaded={(url) => setPrescriptionImageUrl(url)} />
                )}
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Customer phone (optional)</label>
          <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="01XXXXXXXXX" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Customer name (optional)</label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Payment method</label>
          <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {paymentMethod === "CASH" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cash tendered</label>
            <Input type="number" step="0.01" min="0" value={cashTendered} onChange={(e) => setCashTendered(e.target.value)} />
          </div>
        )}

        <div className="border-t border-border pt-3">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>৳{subtotal.toFixed(2)}</span>
          </div>
          {taxAmount > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>VAT</span>
              <span>৳{taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between text-base font-bold text-foreground">
            <span>Total</span>
            <span>৳{total.toFixed(2)}</span>
          </div>
          {paymentMethod === "CASH" && tendered > 0 && (
            <div className="mt-1 flex justify-between text-sm text-mint-dark">
              <span>Change</span>
              <span>৳{change.toFixed(2)}</span>
            </div>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting || cart.length === 0 || (hasRxItems && !prescriptionId)} size="lg">
          {isSubmitting ? "Processing…" : "Complete sale"}
        </Button>
      </div>
    </div>
  );
}
