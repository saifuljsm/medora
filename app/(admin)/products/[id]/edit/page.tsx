import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { PageHeader } from "@/components/admin/page-header";

export default async function ProductEditPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return null;
  assertCan(session.user, "catalog:manage");

  const product = await prisma.product.findUnique({ where: { id: params.id }, include: { medicine: true } });
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title={product.brandName}
        description={`${product.medicine.genericName}${product.medicine.strength ? ` ${product.medicine.strength}` : ""}`}
      />
      <ProductEditForm
        product={{
          id: product.id,
          brandName: product.brandName,
          packSize: product.packSize ?? undefined,
          barcode: product.barcode ?? undefined,
          defaultMrp: product.defaultMrp != null ? Number(product.defaultMrp) : undefined,
          vatRate: product.vatRate != null ? Number(product.vatRate) : undefined,
          sellsByUnit: product.sellsByUnit,
          unitLabel: product.unitLabel ?? undefined,
          unitPrice: product.unitPrice != null ? Number(product.unitPrice) : undefined,
          unitsPerPack: product.unitsPerPack ?? undefined,
          packLabel: product.packLabel ?? undefined,
          packPrice: product.packPrice != null ? Number(product.packPrice) : undefined,
          slug: product.slug ?? undefined,
          shortDescription: product.shortDescription ?? undefined,
          description: product.description ?? undefined,
          images: product.images,
          metaTitle: product.metaTitle ?? undefined,
          metaDescription: product.metaDescription ?? undefined,
        }}
      />
    </div>
  );
}
