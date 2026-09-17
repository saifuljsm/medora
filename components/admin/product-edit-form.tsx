"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/admin/image-upload";
import { updateProduct, type UpdateProductInput } from "@/app/(admin)/products/[id]/edit/actions";

export function ProductEditForm({ product }: { product: UpdateProductInput }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, watch, setValue } = useForm<UpdateProductInput>({ defaultValues: product });
  const images = watch("images");
  const sellsByUnit = watch("sellsByUnit");

  async function onSubmit(values: UpdateProductInput) {
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);
    const result = await updateProduct(values);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      {error && <div className="rounded-md border border-destructive bg-destructive-tint px-3 py-2 text-sm text-destructive">{error}</div>}
      {success && <div className="rounded-md border border-mint bg-mint-tint px-3 py-2 text-sm text-mint-dark">Saved.</div>}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Basics</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Brand name</label>
            <Input {...register("brandName")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Pack size</label>
            <Input {...register("packSize")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Barcode</label>
            <Input {...register("barcode")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Default MRP</label>
            <Input type="number" step="0.01" min="0" {...register("defaultMrp")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Discount (%)</label>
            <Input type="number" step="0.01" min="0" max="100" {...register("discountPercent")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">VAT rate (%)</label>
            <Input type="number" step="0.01" min="0" max="100" {...register("vatRate")} />
          </div>
        </div>
        <p className="text-xs text-muted-text">
          Default MRP / pack price / unit price are always the printed reference price — discount computes the actual selling price
          automatically, for piece, pack, and single-item products alike.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Piece / pack pricing</h2>
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="sellsByUnit"
            render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
          />
          <span className="text-sm text-foreground">Sells by individual unit (breakable dosage form)</span>
        </div>
        {sellsByUnit && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Unit label (e.g. Tablet)</label>
              <Input {...register("unitLabel")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Unit price</label>
              <Input type="number" step="0.01" min="0" {...register("unitPrice")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Units per pack</label>
              <Input type="number" step="1" min="1" {...register("unitsPerPack")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Pack label (e.g. Strip)</label>
              <Input {...register("packLabel")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Pack price</label>
              <Input type="number" step="0.01" min="0" {...register("packPrice")} />
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Storefront content</h2>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Slug (URL)</label>
          <Input {...register("slug")} placeholder="napa-500mg-tablet" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Short description</label>
          <Input {...register("shortDescription")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Description</label>
          <Textarea rows={5} {...register("description")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Images</label>
          <div className="flex flex-wrap gap-2">
            {images.map((url, i) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-20 w-20 rounded-md border border-border object-cover" />
                <button
                  type="button"
                  onClick={() => setValue("images", images.filter((_, idx) => idx !== i))}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <ImageUpload purpose="product-image" label="Add image" onUploaded={(url) => setValue("images", [...images, url])} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Meta title</label>
            <Input {...register("metaTitle")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Meta description</label>
            <Input {...register("metaDescription")} />
          </div>
        </div>
      </section>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
