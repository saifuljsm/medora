import { prisma } from "@/lib/prisma";
import type { StorefrontProductCard } from "@/components/storefront/product-card";

/** The online storefront sells whatever stock sits at branches marked isOnline. */
export async function getOnlineBranchIds(orgId: string): Promise<string[]> {
  const branches = await prisma.branch.findMany({ where: { orgId, isOnline: true }, select: { id: true } });
  return branches.map((b) => b.id);
}

export function productToCard(
  product: {
    id: string;
    slug: string | null;
    brandName: string;
    images: string[];
    sellsByUnit: boolean;
    unitPrice: unknown;
    unitsPerPack: number | null;
    packPrice: unknown;
    defaultMrp: unknown;
    discountPercent: unknown;
    medicine: { genericName: string; strength: string | null; requiresPrescription: boolean };
  },
  stock: number,
): StorefrontProductCard {
  const num = (v: unknown): number | null => (v == null ? null : Number(v));
  const packPrice = num(product.packPrice);
  const unitPrice = num(product.unitPrice);
  const defaultMrp = num(product.defaultMrp);
  const discountPercent = num(product.discountPercent);

  // unitPrice/packPrice/defaultMrp are always the printed/reference price
  // — mirrors lib/pricing.ts's resolveSaleLinePricing exactly, so the
  // storefront never shows a price different from what checkout charges.
  function discounted(reference: number | null): number | null {
    if (reference == null) return null;
    if (!discountPercent || discountPercent <= 0) return reference;
    return reference * (1 - discountPercent / 100);
  }

  let price: number;
  let referencePrice: number | null = null;
  let priceLabel = "";
  let defaultSaleUnit: "PIECE" | "PACK" = "PACK";
  if (product.sellsByUnit) {
    if (packPrice != null) {
      referencePrice = packPrice;
      price = discounted(packPrice)!;
      defaultSaleUnit = "PACK";
    } else if (unitPrice != null) {
      referencePrice = unitPrice;
      price = discounted(unitPrice)!;
      priceLabel = "from";
      defaultSaleUnit = "PIECE";
    } else {
      price = 0;
    }
  } else {
    referencePrice = defaultMrp;
    price = discounted(defaultMrp) ?? 0;
  }

  const mrp = referencePrice && referencePrice > price ? referencePrice : null;

  return {
    id: product.id,
    slug: product.slug,
    brandName: product.brandName,
    genericLabel: `${product.medicine.genericName}${product.medicine.strength ? " " + product.medicine.strength : ""}`,
    images: product.images,
    requiresPrescription: product.medicine.requiresPrescription,
    stock,
    mrp,
    price,
    priceLabel,
    defaultSaleUnit,
  };
}

export async function getStockByProduct(orgId: string, productIds?: string[]): Promise<Map<string, number>> {
  const onlineBranchIds = await getOnlineBranchIds(orgId);
  if (onlineBranchIds.length === 0) return new Map();

  const rows = await prisma.batch.groupBy({
    by: ["productId"],
    where: {
      orgId,
      branchId: { in: onlineBranchIds },
      quantity: { gt: 0 },
      ...(productIds ? { productId: { in: productIds } } : {}),
    },
    _sum: { quantity: true },
  });

  return new Map(rows.map((r) => [r.productId, r._sum.quantity ?? 0]));
}
