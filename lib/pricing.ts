import { Prisma, PurchaseUnit } from "@prisma/client";

/**
 * Piece/pack price resolution and pack <-> base-unit conversion, shared by
 * Receiving (purchase -> Batch.quantity), POS, and Checkout (sale -> price
 * + Batch.quantity decrement). Batch.quantity is always base units
 * (tablets, vials, bottles) — never strips or boxes — so every caller that
 * touches money or stock for a Product funnels through here rather than
 * re-deriving the pack math inline.
 */

export type Decimal = Prisma.Decimal;
export const Decimal = Prisma.Decimal;

type DecimalInput = Decimal | number | string;

// ─────────────────────────────────────────────────────────────────
// Purchasing -> base units (Receiving)
// ─────────────────────────────────────────────────────────────────

export interface PurchaseLineConversionInput {
  unit: PurchaseUnit; // PIECE | PACK, as ordered on the PurchaseOrderItem
  quantity: number; // in `unit`, as received (may be less than ordered)
  unitCost: DecimalInput; // cost per `unit`, from PurchaseOrderItem.unitCost
  unitsPerPack: number | null; // Product.unitsPerPack
}

export interface PurchaseLineConversionResult {
  baseUnitQuantity: number; // for Batch.quantity
  baseUnitCost: Decimal; // for Batch.purchasePrice (per base unit)
}

export function convertPurchaseLineToBaseUnits(input: PurchaseLineConversionInput): PurchaseLineConversionResult {
  const unitCost = new Decimal(input.unitCost);

  if (input.unit === PurchaseUnit.PIECE) {
    return { baseUnitQuantity: input.quantity, baseUnitCost: unitCost };
  }

  if (!input.unitsPerPack || input.unitsPerPack <= 0) {
    throw new Error(
      "This product has no unitsPerPack set — it can't be received by the PACK until that's configured on the product.",
    );
  }

  return {
    baseUnitQuantity: input.quantity * input.unitsPerPack,
    baseUnitCost: unitCost.div(input.unitsPerPack),
  };
}

// ─────────────────────────────────────────────────────────────────
// Selling -> base units + price (POS / Checkout)
// ─────────────────────────────────────────────────────────────────

export type SaleUnit = "PIECE" | "PACK";

export interface ProductPricingInfo {
  sellsByUnit: boolean;
  unitPrice: DecimalInput | null;
  unitsPerPack: number | null;
  packPrice: DecimalInput | null;
  defaultMrp: DecimalInput | null;
}

export interface SaleLinePricing {
  baseUnitQuantity: number; // to decrement from Batch.quantity
  unitPrice: Decimal; // per base unit — matches SaleItem.unitPrice's semantics (quantity is base units)
  lineTotal: Decimal;
}

/**
 * Resolves what a line of `quantity` `saleUnit`s of `product` actually
 * costs and how many base units it consumes. `saleUnit` is only
 * meaningful when the product sells by unit (its dosage form is
 * breakable, e.g. tablets sold as loose pieces or as a strip) — for a
 * non-breakable product (a bottle of syrup, a tube of cream) the base
 * unit IS the whole retail item, priced at defaultMrp.
 */
export function resolveSaleLinePricing(params: {
  product: ProductPricingInfo;
  saleUnit: SaleUnit;
  quantity: number;
}): SaleLinePricing {
  const { product, saleUnit, quantity } = params;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`resolveSaleLinePricing: quantity must be a positive integer, got ${quantity}`);
  }

  if (!product.sellsByUnit) {
    if (product.defaultMrp == null) throw new Error("Product has no defaultMrp set.");
    const unitPrice = new Decimal(product.defaultMrp);
    return { baseUnitQuantity: quantity, unitPrice, lineTotal: unitPrice.mul(quantity) };
  }

  if (saleUnit === "PACK") {
    if (!product.unitsPerPack || product.unitsPerPack <= 0) {
      throw new Error("Product has no unitsPerPack set — cannot sell by the pack.");
    }
    if (product.packPrice == null) throw new Error("Product has no packPrice set.");
    const packPrice = new Decimal(product.packPrice);
    return {
      baseUnitQuantity: quantity * product.unitsPerPack,
      unitPrice: packPrice.div(product.unitsPerPack), // per base unit, for SaleItem.unitPrice
      lineTotal: packPrice.mul(quantity),
    };
  }

  // PIECE
  if (product.unitPrice == null) throw new Error("Product has no unitPrice set.");
  const unitPrice = new Decimal(product.unitPrice);
  return { baseUnitQuantity: quantity, unitPrice, lineTotal: unitPrice.mul(quantity) };
}

// ─────────────────────────────────────────────────────────────────
// VAT
// ─────────────────────────────────────────────────────────────────

/** Product.vatRate is a percentage; most medicines are exempt (null/0 in app logic). */
export function computeLineVat(lineSubtotal: DecimalInput, vatRate: DecimalInput | null): Decimal {
  if (vatRate == null) return new Decimal(0);
  return new Decimal(lineSubtotal).mul(new Decimal(vatRate)).div(100);
}
