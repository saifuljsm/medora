"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addCartLine, getOrCreateCartId, setCartLineQuantity } from "@/lib/cart";

const SaleUnitSchema = z.enum(["PIECE", "PACK"]);

const AddToCartSchema = z.object({
  productId: z.string().min(1),
  saleUnit: SaleUnitSchema,
  quantity: z.number().int().positive(),
});

export async function addToCartAction(input: z.infer<typeof AddToCartSchema>): Promise<{ itemCount: number }> {
  const data = AddToCartSchema.parse(input);
  const cartId = getOrCreateCartId();
  const lines = await addCartLine(cartId, data);
  revalidatePath("/", "layout");
  return { itemCount: lines.reduce((sum, l) => sum + l.quantity, 0) };
}

const UpdateQuantitySchema = z.object({
  productId: z.string().min(1),
  saleUnit: SaleUnitSchema,
  quantity: z.number().int().min(0),
});

export async function updateCartQuantityAction(input: z.infer<typeof UpdateQuantitySchema>): Promise<{ itemCount: number }> {
  const data = UpdateQuantitySchema.parse(input);
  const cartId = getOrCreateCartId();
  const lines = await setCartLineQuantity(cartId, data.productId, data.saleUnit, data.quantity);
  revalidatePath("/", "layout");
  return { itemCount: lines.reduce((sum, l) => sum + l.quantity, 0) };
}

export async function removeFromCartAction(productId: string, saleUnit: "PIECE" | "PACK"): Promise<{ itemCount: number }> {
  return updateCartQuantityAction({ productId, saleUnit, quantity: 0 });
}
