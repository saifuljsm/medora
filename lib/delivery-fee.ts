import { Decimal } from "@/lib/pricing";

/**
 * Flat delivery-fee tiers by district — the pharmacy is single-branch in
 * Kushtia, so "inside district" vs "everywhere else" is the only distinction
 * that matters for now. These are placeholder amounts (not from the build
 * spec) until the owner gives real numbers; kept in one place so they're
 * easy to tune without touching checkout logic.
 */
const INSIDE_DISTRICT_FEE = new Decimal(60);
const OUTSIDE_DISTRICT_FEE = new Decimal(120);
const HOME_DISTRICT = "Kushtia";

export function computeDeliveryFee(district: string): Decimal {
  return district.trim().toLowerCase() === HOME_DISTRICT.toLowerCase() ? INSIDE_DISTRICT_FEE : OUTSIDE_DISTRICT_FEE;
}
