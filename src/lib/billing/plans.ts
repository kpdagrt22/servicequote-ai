/**
 * Pure mapping between Stripe price ids and our plan ids.
 *
 * The webhook receives a price id (or the plan we stamped in checkout metadata)
 * and needs to record which plan the organization is on. Kept pure + injectable
 * so it is unit-tested without env.
 */
import type { PlanId } from "@/lib/constants";

export interface PriceMap {
  starter: string;
  pro: string;
  team: string;
  setup: string;
}

const PLAN_IDS: PlanId[] = ["starter", "pro", "team"];

export function isPlanId(value: string | null | undefined): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as string[]).includes(value);
}

/** Resolve a Stripe price id to a plan id using the configured price map. */
export function planForPriceId(priceId: string | null | undefined, prices: PriceMap): PlanId | null {
  if (!priceId) return null;
  if (prices.starter && priceId === prices.starter) return "starter";
  if (prices.pro && priceId === prices.pro) return "pro";
  if (prices.team && priceId === prices.team) return "team";
  return null;
}
