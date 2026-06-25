import { describe, it, expect } from "vitest";
import {
  safeNumber,
  computeLaborCost,
  computeMarkupPrice,
  isUnusualTaxPercent,
  validateLineItemInput,
  computeLineItem,
  computeQuoteTotals,
  round2,
  MAX_REASONABLE_TAX_PERCENT,
} from "@/lib/quotes/calculations";

describe("safeNumber", () => {
  it("returns finite numbers unchanged", () => {
    expect(safeNumber(12.34)).toBe(12.34);
    expect(safeNumber(0)).toBe(0);
  });
  it("parses numeric strings", () => {
    expect(safeNumber("42")).toBe(42);
    expect(safeNumber("3.5")).toBe(3.5);
  });
  it("never returns NaN or Infinity", () => {
    expect(safeNumber(NaN, 7)).toBe(7);
    expect(safeNumber(Infinity, 7)).toBe(7);
    expect(safeNumber(-Infinity, 7)).toBe(7);
    expect(safeNumber("abc", 7)).toBe(7);
    expect(safeNumber("", 7)).toBe(7);
    expect(safeNumber(null, 7)).toBe(7);
    expect(safeNumber(undefined, 7)).toBe(7);
    expect(safeNumber({}, 7)).toBe(7);
  });
});

describe("computeLaborCost / computeMarkupPrice aliases", () => {
  it("computeLaborCost converts minutes at an hourly rate", () => {
    expect(computeLaborCost(60, 100)).toBe(100);
    expect(computeLaborCost(30, 90)).toBe(45);
  });
  it("computeMarkupPrice applies markup", () => {
    expect(computeMarkupPrice(100, 20)).toBe(120);
    expect(computeMarkupPrice(50, 0)).toBe(50);
  });
});

describe("isUnusualTaxPercent", () => {
  it("flags tax outside 0..30", () => {
    expect(isUnusualTaxPercent(35)).toBe(true);
    expect(isUnusualTaxPercent(-1)).toBe(true);
    expect(isUnusualTaxPercent(MAX_REASONABLE_TAX_PERCENT + 0.1)).toBe(true);
  });
  it("accepts normal tax", () => {
    expect(isUnusualTaxPercent(0)).toBe(false);
    expect(isUnusualTaxPercent(8.25)).toBe(false);
    expect(isUnusualTaxPercent(30)).toBe(false);
  });
});

describe("validateLineItemInput", () => {
  it("accepts a normal line item and normalizes it", () => {
    const r = validateLineItemInput({
      name: "Install outlet",
      quantity: "2",
      materialCost: "18",
      laborMinutes: "45",
      laborRate: "90",
      markupPercent: "20",
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.normalized.quantity).toBe(2);
    expect(r.normalized.materialCost).toBe(18);
  });

  it("applies defaults for empty values (qty 1, costs 0)", () => {
    const r = validateLineItemInput({});
    expect(r.ok).toBe(true);
    expect(r.normalized.quantity).toBe(1);
    expect(r.normalized.materialCost).toBe(0);
    expect(r.normalized.laborMinutes).toBe(0);
    expect(r.normalized.markupPercent).toBe(0);
    expect(r.normalized.unitPriceOverride).toBeNull();
  });

  it("rejects negative quantity, costs, and prices", () => {
    const r = validateLineItemInput({
      name: "x",
      quantity: -1,
      materialCost: -5,
      laborMinutes: -10,
      laborRate: -90,
      markupPercent: -3,
      unitPriceOverride: -100,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(5);
    expect(r.errors.some((e) => e.includes("Quantity"))).toBe(true);
    expect(r.errors.some((e) => e.includes("Unit price"))).toBe(true);
  });

  it("rejects a blank name when name is provided", () => {
    const r = validateLineItemInput({ name: "   " });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("name"))).toBe(true);
  });

  it("rounds a high-precision override before use", () => {
    const r = validateLineItemInput({ name: "x", unitPriceOverride: 107.335 });
    expect(r.ok).toBe(true);
    expect(r.normalized.unitPriceOverride).toBe(107.34);
  });

  it("treats non-finite override as invalid", () => {
    const r = validateLineItemInput({ name: "x", unitPriceOverride: "abc" });
    expect(r.ok).toBe(false);
  });
});

describe("end-to-end calculation scenarios", () => {
  const line = (over: Record<string, number>) => ({
    quantity: 1,
    materialCost: 0,
    laborMinutes: 0,
    laborRate: 0,
    markupPercent: 0,
    ...over,
  });

  it("material-only line", () => {
    const r = computeLineItem(line({ materialCost: 50, markupPercent: 0 }));
    expect(r.unitPrice).toBe(50);
    expect(r.totalPrice).toBe(50);
  });

  it("labor-only line", () => {
    const r = computeLineItem(line({ laborMinutes: 90, laborRate: 100 }));
    expect(r.unitPrice).toBe(150); // 1.5h * 100
  });

  it("labor + material + markup", () => {
    const r = computeLineItem(line({ materialCost: 20, laborMinutes: 60, laborRate: 90, markupPercent: 25 }));
    expect(r.unitPrice).toBe(137.5); // (20 + 90) * 1.25
  });

  it("decimal quantity", () => {
    const r = computeLineItem(line({ quantity: 2.5, materialCost: 10 }));
    expect(r.totalPrice).toBe(25);
  });

  it("zero quantity yields zero total", () => {
    const r = computeLineItem(line({ quantity: 0, materialCost: 100 }));
    expect(r.totalPrice).toBe(0);
  });

  it("large values stay finite and rounded", () => {
    const r = computeLineItem(line({ quantity: 1000, materialCost: 999999, markupPercent: 50 }));
    expect(Number.isFinite(r.totalPrice)).toBe(true);
    expect(r.totalPrice).toBe(round2(round2(999999 * 1.5) * 1000));
  });

  it("tax: zero, decimal, and high", () => {
    expect(computeQuoteTotals({ lineTotals: [100], taxPercent: 0 }).total).toBe(100);
    expect(computeQuoteTotals({ lineTotals: [100], taxPercent: 8.25 }).taxAmount).toBe(8.25);
    const high = computeQuoteTotals({ lineTotals: [100], taxPercent: 40 });
    expect(high.taxAmount).toBe(40); // not silently broken
    expect(high.total).toBe(140);
  });
});
