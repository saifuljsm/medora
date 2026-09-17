import crypto from "crypto";
import { cookies } from "next/headers";
import { redisConnection } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { resolveSaleLinePricing, type SaleUnit } from "@/lib/pricing";
import { getStockByProduct } from "@/lib/storefront";

/**
 * The cart itself lives in Redis, keyed off an anonymous id in an httpOnly
 * cookie — there's no customer auth yet, so this is the only identity a
 * guest checkout has. Only {productId, saleUnit, quantity} is stored; price,
 * stock, and product details are always re-read from Postgres at hydration
 * time so a cart never serves a stale price.
 */

const CART_COOKIE = "medora_cart_id";
const CART_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface CartLine {
  productId: string;
  saleUnit: SaleUnit;
  quantity: number;
}

function cartKey(cartId: string): string {
  return `cart:${cartId}`;
}

/** Read-only — safe to call from Server Components (never mutates cookies during render). */
export function getCartId(): string | null {
  return cookies().get(CART_COOKIE)?.value ?? null;
}

/** Server Actions / Route Handlers only — creates the cookie if missing. */
export function getOrCreateCartId(): string {
  const store = cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) return existing;
  const id = crypto.randomUUID();
  store.set(CART_COOKIE, id, { httpOnly: true, sameSite: "lax", maxAge: CART_TTL_SECONDS, path: "/" });
  return id;
}

export async function getCartLines(cartId: string | null): Promise<CartLine[]> {
  if (!cartId) return [];
  const raw = await redisConnection.get(cartKey(cartId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveCartLines(cartId: string, lines: CartLine[]): Promise<void> {
  if (lines.length === 0) {
    await redisConnection.del(cartKey(cartId));
    return;
  }
  await redisConnection.set(cartKey(cartId), JSON.stringify(lines), "EX", CART_TTL_SECONDS);
}

export async function addCartLine(cartId: string, line: CartLine): Promise<CartLine[]> {
  const lines = await getCartLines(cartId);
  const existing = lines.find((l) => l.productId === line.productId && l.saleUnit === line.saleUnit);
  if (existing) {
    existing.quantity += line.quantity;
  } else {
    lines.push(line);
  }
  await saveCartLines(cartId, lines);
  return lines;
}

export async function setCartLineQuantity(
  cartId: string,
  productId: string,
  saleUnit: SaleUnit,
  quantity: number,
): Promise<CartLine[]> {
  let lines = await getCartLines(cartId);
  if (quantity <= 0) {
    lines = lines.filter((l) => !(l.productId === productId && l.saleUnit === saleUnit));
  } else {
    const existing = lines.find((l) => l.productId === productId && l.saleUnit === saleUnit);
    if (existing) existing.quantity = quantity;
    else lines.push({ productId, saleUnit, quantity });
  }
  await saveCartLines(cartId, lines);
  return lines;
}

export async function clearCart(cartId: string): Promise<void> {
  await redisConnection.del(cartKey(cartId));
}

export async function getCartItemCount(cartId: string | null): Promise<number> {
  const lines = await getCartLines(cartId);
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

// ─────────────────────────────────────────────────────────────────
// Hydration — combine stored lines with live product/price/stock data
// ─────────────────────────────────────────────────────────────────

export interface HydratedCartLine {
  productId: string;
  slug: string | null;
  brandName: string;
  genericLabel: string;
  image: string | null;
  saleUnit: SaleUnit;
  quantity: number;
  unitDisplayPrice: number; // price per saleUnit, for display
  lineTotal: number;
  stock: number; // live available base-unit stock
  requiresPrescription: boolean;
  insufficientStock: boolean;
}

export interface HydratedCart {
  lines: HydratedCartLine[];
  removedCount: number; // lines that referenced a product no longer sellable — dropped silently from totals, surfaced here
  subtotal: number;
  itemCount: number;
  requiresPrescription: boolean;
  hasIssues: boolean;
}

const EMPTY_CART: HydratedCart = {
  lines: [],
  removedCount: 0,
  subtotal: 0,
  itemCount: 0,
  requiresPrescription: false,
  hasIssues: false,
};

export async function hydrateCart(orgId: string, cartId: string | null): Promise<HydratedCart> {
  const cartLines = await getCartLines(cartId);
  if (cartLines.length === 0) return EMPTY_CART;

  const productIds = Array.from(new Set(cartLines.map((l) => l.productId)));
  const [products, stockByProduct] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds } }, include: { medicine: true } }),
    getStockByProduct(orgId, productIds),
  ]);
  const productById = new Map(products.map((p) => [p.id, p]));

  const lines: HydratedCartLine[] = [];
  let removedCount = 0;

  for (const cl of cartLines) {
    const product = productById.get(cl.productId);
    if (!product) {
      removedCount += 1;
      continue;
    }
    const stock = stockByProduct.get(cl.productId) ?? 0;
    let pricing;
    try {
      pricing = resolveSaleLinePricing({ product, saleUnit: cl.saleUnit, quantity: cl.quantity });
    } catch {
      removedCount += 1;
      continue;
    }

    lines.push({
      productId: product.id,
      slug: product.slug,
      brandName: product.brandName,
      genericLabel: `${product.medicine.genericName}${product.medicine.strength ? " " + product.medicine.strength : ""}`,
      image: product.images[0] ?? null,
      saleUnit: cl.saleUnit,
      quantity: cl.quantity,
      unitDisplayPrice: pricing.lineTotal.toNumber() / cl.quantity,
      lineTotal: pricing.lineTotal.toNumber(),
      stock,
      requiresPrescription: product.medicine.requiresPrescription,
      insufficientStock: pricing.baseUnitQuantity > stock,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const requiresPrescription = lines.some((l) => l.requiresPrescription);
  const hasIssues = removedCount > 0 || lines.some((l) => l.insufficientStock);

  return { lines, removedCount, subtotal, itemCount, requiresPrescription, hasIssues };
}
