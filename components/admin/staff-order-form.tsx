"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/admin/image-upload";
import { createStaffAssistedOrder } from "@/app/(admin)/orders/new/actions";
import { createAndApprovePrescriptionForOrder } from "@/app/(admin)/orders/new/prescription-actions";

interface StaffOrderProduct {
  id: string;
  brandName: string;
  genericLabel: string;
  requiresPrescription: boolean;
  sellsByUnit: boolean;
  unitLabel: string | null;
  unitPrice: number | null;
  unitsPerPack: number | null;
  packLabel: string | null;
  packPrice: number | null;
  defaultMrp: number | null;
  stock: number;
}

interface CartLine {
  productId: string;
  saleUnit: "PIECE" | "PACK";
  quantity: number;
}

const ORDER_SOURCES = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "PHONE_CALL", label: "Phone call" },
  { value: "STAFF_ASSISTED", label: "In person / other" },
] as const;

function lineUnitPrice(p: StaffOrderProduct, saleUnit: "PIECE" | "PACK"): number {
  if (!p.sellsByUnit) return p.defaultMrp ?? 0;
  return (saleUnit === "PACK" ? p.packPrice : p.unitPrice) ?? 0;
}

export function StaffOrderForm({ products }: { products: StaffOrderProduct[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderSource, setOrderSource] = useState<(typeof ORDER_SOURCES)[number]["value"]>("WHATSAPP");
  const [form, setForm] = useState({ name: "", phone: "", division: "", district: "Kushtia", upazila: "", line1: "", line2: "", postCode: "" });
  const [prescriptionImageUrl, setPrescriptionImageUrl] = useState("");
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [isApprovingRx, setIsApprovingRx] = useState(false);
  const [rxError, setRxError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const hasRxItems = cart.some((l) => productsById.get(l.productId)?.requiresPrescription);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return products.filter((p) => p.brandName.toLowerCase().includes(q) || p.genericLabel.toLowerCase().includes(q)).slice(0, 20);
  }, [products, query]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addToCart(product: StaffOrderProduct) {
    setCart((prev) => {
      const defaultUnit: "PIECE" | "PACK" = product.sellsByUnit ? "PIECE" : "PACK";
      const existing = prev.find((l) => l.productId === product.id && l.saleUnit === defaultUnit);
      if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
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

  const subtotal = cart.reduce((sum, l) => {
    const p = productsById.get(l.productId);
    return p ? sum + lineUnitPrice(p, l.saleUnit) * l.quantity : sum;
  }, 0);

  async function handleApproveRx() {
    setRxError(null);
    if (!prescriptionImageUrl) {
      setRxError("Upload a prescription photo first");
      return;
    }
    setIsApprovingRx(true);
    const result = await createAndApprovePrescriptionForOrder({ imageUrl: prescriptionImageUrl });
    setIsApprovingRx(false);
    if (!result.success) {
      setRxError(result.error);
      return;
    }
    setPrescriptionId(result.prescriptionId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (cart.length === 0) {
      setError("Add at least one item");
      return;
    }
    setIsPending(true);
    const result = await createStaffAssistedOrder({
      orderSource,
      ...form,
      prescriptionId: prescriptionId ?? undefined,
      items: cart.map((l) => ({ productId: l.productId, saleUnit: l.saleUnit, quantity: l.quantity })),
    });
    setIsPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/orders/${result.orderId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-3">
        <Input placeholder="Search products to add…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
                <span className={p.stock > 0 ? "text-xs text-mint-dark" : "text-xs text-destructive"}>
                  {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-2 flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">Items</h2>
          {cart.length === 0 && <p className="text-sm text-muted-foreground">No items yet — search above to add.</p>}
          {cart.map((line, index) => {
            const product = productsById.get(line.productId);
            if (!product) return null;
            const unitPrice = lineUnitPrice(product, line.saleUnit);
            return (
              <div key={`${line.productId}-${line.saleUnit}-${index}`} className="flex items-center gap-2 rounded-md border border-border p-2">
                <div className="flex-1 text-sm font-medium text-foreground">{product.brandName}</div>
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
          {cart.length > 0 && (
            <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold text-foreground">
              <span>Subtotal</span>
              <span>৳{subtotal.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-lg border border-border bg-card p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">Order source</label>
          <select
            value={orderSource}
            onChange={(e) => setOrderSource(e.target.value as typeof orderSource)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {ORDER_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {hasRxItems && (
          <div className="flex flex-col gap-2 rounded-md border border-warning bg-warning-tint p-3">
            <p className="text-sm font-semibold text-warning">Prescription required</p>
            {prescriptionId ? (
              <p className="text-sm text-mint-dark">Approved and attached.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  If the customer already has an approved prescription on file (by phone number), it&apos;ll be found
                  automatically. Otherwise a pharmacist or owner can approve one now.
                </p>
                {rxError && <p className="text-xs text-destructive">{rxError}</p>}
                {prescriptionImageUrl ? (
                  <Button type="button" size="sm" onClick={handleApproveRx} disabled={isApprovingRx}>
                    {isApprovingRx ? "Approving…" : "Approve & attach"}
                  </Button>
                ) : (
                  <ImageUpload purpose="prescription-photo" label="Upload photo" onUploaded={setPrescriptionImageUrl} />
                )}
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-foreground">Customer name</label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-foreground">Phone</label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01XXXXXXXXX" required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Division</label>
            <Input value={form.division} onChange={(e) => set("division", e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">District</label>
            <Input value={form.district} onChange={(e) => set("district", e.target.value)} required />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-foreground">Upazila</label>
            <Input value={form.upazila} onChange={(e) => set("upazila", e.target.value)} required />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-foreground">Street address</label>
            <Input value={form.line1} onChange={(e) => set("line1", e.target.value)} required />
          </div>
        </div>

        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

        <Button type="submit" disabled={isPending || cart.length === 0} size="lg">
          {isPending ? "Creating…" : "Create order"}
        </Button>
      </div>
    </form>
  );
}
