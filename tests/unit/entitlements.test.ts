import { describe, it, expect } from "vitest";
import {
  isSubscriptionActive,
  planFromSubscription,
  isPaid,
  quoteLimit,
  canCreateQuote,
} from "@/lib/billing/entitlements";
import { FREE_QUOTE_LIMIT } from "@/lib/constants";

const sub = (plan: string | null, status: string | null) => ({ plan, status });

describe("subscription activeness", () => {
  it("treats active/trialing/past_due as active", () => {
    expect(isSubscriptionActive(sub("pro", "active"))).toBe(true);
    expect(isSubscriptionActive(sub("pro", "trialing"))).toBe(true);
    expect(isSubscriptionActive(sub("pro", "past_due"))).toBe(true);
  });
  it("treats canceled/incomplete/null as inactive", () => {
    expect(isSubscriptionActive(sub("pro", "canceled"))).toBe(false);
    expect(isSubscriptionActive(sub("pro", "incomplete"))).toBe(false);
    expect(isSubscriptionActive(sub("pro", null))).toBe(false);
    expect(isSubscriptionActive(null)).toBe(false);
    expect(isSubscriptionActive(undefined)).toBe(false);
  });
});

describe("plan resolution", () => {
  it("returns the plan only when active and recognised", () => {
    expect(planFromSubscription(sub("pro", "active"))).toBe("pro");
    expect(planFromSubscription(sub("starter", "trialing"))).toBe("starter");
    expect(planFromSubscription(sub("team", "active"))).toBe("team");
    expect(planFromSubscription(sub("pro", "canceled"))).toBeNull();
    expect(planFromSubscription(sub("bogus", "active"))).toBeNull();
    expect(planFromSubscription(null)).toBeNull();
  });
  it("isPaid reflects an active recognised plan", () => {
    expect(isPaid(sub("pro", "active"))).toBe(true);
    expect(isPaid(sub("pro", "canceled"))).toBe(false);
    expect(isPaid(null)).toBe(false);
  });
});

describe("quote entitlement", () => {
  it("free tier is capped at FREE_QUOTE_LIMIT", () => {
    expect(quoteLimit(null)).toBe(FREE_QUOTE_LIMIT);
    expect(canCreateQuote(null, 0).allowed).toBe(true);
    expect(canCreateQuote(null, FREE_QUOTE_LIMIT - 1).allowed).toBe(true);
    const blocked = canCreateQuote(null, FREE_QUOTE_LIMIT);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/limit/i);
  });
  it("paid plans are unlimited", () => {
    expect(quoteLimit(sub("pro", "active"))).toBeNull();
    expect(canCreateQuote(sub("pro", "active"), 9999).allowed).toBe(true);
  });
  it("an inactive paid plan falls back to the free cap", () => {
    expect(quoteLimit(sub("pro", "canceled"))).toBe(FREE_QUOTE_LIMIT);
    expect(canCreateQuote(sub("pro", "canceled"), FREE_QUOTE_LIMIT).allowed).toBe(false);
  });
});
