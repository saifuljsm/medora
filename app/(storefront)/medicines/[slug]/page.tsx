import { notFound } from "next/navigation";
import { Pill, FileText, Phone, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getOrg } from "@/lib/org";
import { getStockByProduct, productToCard } from "@/lib/storefront";
import { Accordion, type AccordionSection } from "@/components/storefront/accordion";
import { ProductDetailActions } from "@/components/storefront/product-detail-actions";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const org = await getOrg();
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { medicine: { include: { manufacturer: true } } },
  });
  if (!product) notFound();

  const stockByProduct = await getStockByProduct(org.id, [product.id]);
  const stock = stockByProduct.get(product.id) ?? 0;

  const defaultMrp = product.defaultMrp != null ? Number(product.defaultMrp) : null;
  const unitPrice = product.unitPrice != null ? Number(product.unitPrice) : null;
  const packPrice = product.packPrice != null ? Number(product.packPrice) : null;

  const unitOptions = product.sellsByUnit
    ? [
        ...(unitPrice != null ? [{ unit: "PIECE" as const, label: `1 ${product.unitLabel || "Piece"}`, price: unitPrice }] : []),
        ...(packPrice != null
          ? [{ unit: "PACK" as const, label: `${product.packLabel || "Pack"} of ${product.unitsPerPack ?? "?"}`, price: packPrice }]
          : []),
      ]
    : [{ unit: "PACK" as const, label: product.packSize || "Item", price: defaultMrp ?? 0 }];

  const referencePrice = productToCard(product, stock);

  const sections: AccordionSection[] = [];
  if (product.description || product.shortDescription) {
    sections.push({
      title: "Product overview",
      openByDefault: true,
      body: <p>{product.description || product.shortDescription}</p>,
    });
  }
  if (product.medicine.manufacturer) {
    sections.push({
      title: "Manufacturer",
      body: (
        <p>
          Manufactured by {product.medicine.manufacturer.name}
          {product.medicine.manufacturer.country ? `, ${product.medicine.manufacturer.country}` : ""}.
        </p>
      ),
    });
  }
  if (sections.length === 0) {
    sections.push({ title: "Product overview", openByDefault: true, body: <p>No additional details yet.</p> });
  }

  return (
    <div className="px-4 pt-4 lg:grid lg:grid-cols-2 lg:gap-10 lg:px-0 lg:pt-0">
      <div className="flex overflow-x-auto rounded-2xl lg:sticky lg:top-28 lg:self-start">
        {product.images.length > 0 ? (
          product.images.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={product.brandName} className="aspect-[1/0.9] w-full shrink-0 rounded-2xl object-cover" />
          ))
        ) : (
          <div className="flex aspect-[1/0.9] w-full items-center justify-center rounded-2xl bg-primary-tint">
            <Pill className="h-[34%] w-[34%] text-primary" strokeWidth={1.4} />
          </div>
        )}
      </div>

      <div className="lg:pb-8">
      <div className="my-4 lg:mt-0">
        <h1 className="mb-1 text-[19px] font-bold leading-tight text-foreground">{product.brandName}</h1>
        <p className="mb-0.5 text-[13px] text-muted-foreground">
          {product.packSize ? `${product.packSize} · ` : ""}
          {product.medicine.genericName}
          {product.medicine.strength ? ` ${product.medicine.strength}` : ""}
          {product.medicine.manufacturer ? ` · ${product.medicine.manufacturer.name}` : ""}
        </p>
        <p className={`text-[12.5px] font-semibold ${stock > 0 ? "text-success" : "text-destructive"}`}>
          {stock > 0 ? "In stock" : "Out of stock"}
        </p>
      </div>

      {product.medicine.requiresPrescription && (
        <>
          <div className="my-3 flex items-center gap-2 rounded-lg border border-warning bg-warning-tint px-[11px] py-[9px]">
            <FileText className="h-[17px] w-[17px] shrink-0 text-warning" strokeWidth={2} />
            <p className="text-xs font-semibold text-warning">Prescription required for this medicine</p>
          </div>
          <div className="mb-3.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-tint px-2.5 py-1 text-[11px] font-bold text-warning">
              Status: required — upload at checkout
            </span>
          </div>
        </>
      )}

      <div className="my-3.5 rounded-xl border border-border bg-card p-3.5">
        <div className="flex flex-wrap items-baseline gap-2">
          {/* Reference price/MRP compared like-for-like at the pack level (same
              computation as the product card) — comparing defaultMrp against a
              per-piece price would be an apples-to-oranges "91% off" bug. */}
          <span className="text-2xl font-bold text-primary">৳{referencePrice.price.toFixed(2)}</span>
          {referencePrice.mrp != null && (
            <>
              <span className="text-sm text-muted-text line-through">৳{referencePrice.mrp.toFixed(2)}</span>
              <span className="rounded-[5px] bg-success-tint px-[7px] py-0.5 text-[11.5px] font-bold text-success">
                {Math.round(((referencePrice.mrp - referencePrice.price) / referencePrice.mrp) * 100)}% off
              </span>
            </>
          )}
        </div>
      </div>

      <ProductDetailActions productId={product.id} options={unitOptions} />

      <Accordion sections={sections} />

      <div className="my-4 flex items-center gap-3 rounded-xl bg-primary-tint p-3.5">
        <div className="flex-1">
          <p className="text-[13px] font-bold text-foreground">Need more help?</p>
          <span className="text-[11.5px] text-muted-foreground">Our licensed pharmacist can guide you.</span>
          <div className="mt-2.5 flex gap-2">
            <a
              href="tel:09642000000"
              className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground [&_svg]:hover:text-primary-foreground"
            >
              <Phone className="h-3.5 w-3.5 text-primary transition-colors" strokeWidth={2} /> Call pharmacist
            </a>
            <a
              href="https://wa.me/8809642000000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold transition-colors hover:border-mint hover:bg-mint hover:text-white [&_svg]:hover:text-white"
            >
              <MessageCircle className="h-3.5 w-3.5 text-primary transition-colors" strokeWidth={2} /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-background p-3 text-[11px] leading-relaxed text-muted-text">
        Disclaimer: The information provided is accurate to the best of our knowledge. Product packaging, ingredients,
        specifications, and availability may change without notice. Please check the product packaging before use and
        consult the manufacturer, pharmacist, doctor, or other qualified professional if you have any questions or
        concerns.
      </div>
      </div>
    </div>
  );
}
