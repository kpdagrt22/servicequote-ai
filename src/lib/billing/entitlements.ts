/**
 * Billing entitlements — the single source of truth for "what can this org do".
 *
 * Pure functions over a subscription row + current usage counts so they are
 * unit-tested without a live Stripe/DB. The server actions load the subscription
 * and counts, then call these to decide whether to allow an action.
 */
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  FREE_QUOTE_LIMIT,
  PLAN_QUOTE_LIMITS,
  type PlanId,
} from "@/lib/constants";
import type { Subscription } from "@/lib/types/db";

type SubLike = Pick<Subscription, "plan" | "status"> | null | undefined;

export function isSubscriptionActive(sub: SubLike): boolean {
  if (!sub || !sub.status) return false;
  return (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(sub.status);
}

/** The org's effective paid plan, or null when on the free tier. */
export function planFromSubscription(sub: SubLike): PlanId | null {
  if (!isSubscriptionActive(sub)) return null;
  const plan = sub?.plan;
  if (plan === "starter" || plan === "pro" || plan === "team") return plan;
  return null;
}

export function isPaid(sub: SubLike): boolean {
  return planFromSubscription(sub) !== null;
}

/** Max quotes the org may have. null = unlimited. */
export function quoteLimit(sub: SubLike): number | null {
  const plan = planFromSubscription(sub);
  if (!plan) return FREE_QUOTE_LIMIT;
  return PLAN_QUOTE_LIMITS[plan];
}

export interface EntitlementDecision {
  allowed: boolean;
  limit: number | null;
  reason?: string;
}

/**
 * Can the org create another quote given how many it already has?
 * Unlimited plans always pass; the free tier is capped at FREE_QUOTE_LIMIT.
 */
export function canCreateQuote(sub: SubLike, currentQuoteCount: number): EntitlementDecision {
  const limit = quoteLimit(sub);
  if (limit === null) return { allowed: true, limit: null };
  if (currentQuoteCount < limit) return { allowed: true, limit };
  return {
    allowed: false,
    limit,
    reason: `You've reached the free plan limit of ${limit} quotes. Upgrade your plan to create more.`,
  };
}
