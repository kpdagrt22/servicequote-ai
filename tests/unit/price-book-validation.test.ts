import { describe, it, expect } from "vitest";
import { priceBookItemSchema } from "@/lib/validation/price-book";

describe("priceBookItemSchema", () => {
  it("accepts a valid item and defaults the unit to 'each'", () => {
    const r = priceBookItemSchema.safeParse({ name: "Install outlet", material_cost: "6", labor_minutes: "30" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.unit).toBe("each");
      expect(r.data.material_cost).toBe(6);
      expect(r.data.active).toBe(true);
    }
  });

  it("requires a name", () => {
    const r = priceBookItemSchema.safeParse({ name: "  " });
    expect(r.success).toBe(false);
  });

  it("rejects negative material cost", () => {
    const r = priceBookItemSchema.safeParse({ name: "x", material_cost: "-5" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.errors[0].message).toMatch(/Material cost cannot be negative/);
  });

  it("rejects negative labor minutes and markup", () => {
    expect(priceBookItemSchema.safeParse({ name: "x", labor_minutes: -1 }).success).toBe(false);
    expect(priceBookItemSchema.safeParse({ name: "x", markup_percent: -10 }).success).toBe(false);
  });

  it("rejects a negative price override but allows a positive one", () => {
    expect(priceBookItemSchema.safeParse({ name: "x", price_override: -1 }).success).toBe(false);
    const ok = priceBookItemSchema.safeParse({ name: "x", price_override: "199.99" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.price_override).toBe(199.99);
  });

  it("defaults blank numerics (qty 1, costs 0) and keeps a custom unit", () => {
    const r = priceBookItemSchema.safeParse({ name: "x", unit: "linear ft" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.default_quantity).toBe(1);
      expect(r.data.material_cost).toBe(0);
      expect(r.data.unit).toBe("linear ft");
    }
  });
});
