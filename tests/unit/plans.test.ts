import { describe, it, expect } from "vitest";
import { planForPriceId, isPlanId, type PriceMap } from "@/lib/billing/plans";

const prices: PriceMap = {
  starter: "price_starter",
  pro: "price_pro",
  team: "price_team",
  setup: "price_setup",
};

describe("planForPriceId", () => {
  it("maps known price ids to plans", () => {
    expect(planForPriceId("price_starter", prices)).toBe("starter");
    expect(planForPriceId("price_pro", prices)).toBe("pro");
    expect(planForPriceId("price_team", prices)).toBe("team");
  });
  it("returns null for the setup price, unknown ids, and empties", () => {
    expect(planForPriceId("price_setup", prices)).toBeNull();
    expect(planForPriceId("price_unknown", prices)).toBeNull();
    expect(planForPriceId(null, prices)).toBeNull();
    expect(planForPriceId("", prices)).toBeNull();
  });
  it("never matches when the configured price is blank", () => {
    const blank: PriceMap = { starter: "", pro: "", team: "", setup: "" };
    expect(planForPriceId("", blank)).toBeNull();
    expect(planForPriceId("price_pro", blank)).toBeNull();
  });
});

describe("isPlanId", () => {
  it("recognises plan ids", () => {
    expect(isPlanId("starter")).toBe(true);
    expect(isPlanId("team")).toBe(true);
    expect(isPlanId("setup")).toBe(false);
    expect(isPlanId(null)).toBe(false);
  });
});
