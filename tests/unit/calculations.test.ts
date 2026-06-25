import { describe, it, expect } from "vitest";
import {
  laborCost,
  unitCost,
  applyMarkup,
  computeUnitPrice,
  computeLineTotal,
  computeLineItem,
  computeQuoteTotals,
  computeQuoteFromLines,
} from "@/lib/quotes/calculations";

describe("laborCost", () => {
  it("converts minutes at an hourly rate", () => {
    expect(laborCost(60, 100)).toBe(100);
    expect(laborCost(30, 100)).toBe(50);
    expect(laborCost(45, 120)).toBe(90);
  });
  it("clamps negatives to zero", () => {
    expect(laborCost(-30, 100)).toBe(0);
    expect(laborCost(30, -100)).toBe(0);
  });
});

describe("unitCost", () => {
  it("adds material and labor", () => {
    // material 18 + labor (45min @ $80/h = 60) = 78
    expect(unitCost(18, 45, 80)).toBe(78);
  });
});

describe("applyMarkup", () => {
  it("applies a percentage markup", () => {
    expect(applyMarkup(100, 20)).toBe(120);
    expect(applyMarkup(78, 0)).toBe(78);
    expect(applyMarkup(50, 100)).toBe(100);
  });
  it("handles fractional rounding to cents", () => {
    expect(applyMarkup(33.33, 15)).toBe(38.33);
  });
});

describe("computeUnitPrice", () => {
  it("composes cost + markup", () => {
    // cost = 20 + (60min @ $90 = 90) = 110; +25% = 137.5
    const price = computeUnitPrice({
      quantity: 1,
      materialCost: 20,
      laborMinutes: 60,
      laborRate: 90,
      markupPercent: 25,
    });
    expect(price).toBe(137.5);
  });
});

describe("computeLineTotal", () => {
  it("multiplies unit price by quantity", () => {
    expect(computeLineTotal(137.5, 2)).toBe(275);
  });
  it("clamps negative quantities", () => {
    expect(computeLineTotal(100, -3)).toBe(0);
  });
});

describe("computeLineItem", () => {
  const components = {
    quantity: 2,
    materialCost: 20,
    laborMinutes: 60,
    laborRate: 90,
    markupPercent: 25,
  };
  it("derives suggested price and total from components", () => {
    const r = computeLineItem(components);
    expect(r.unitCost).toBe(110);
    expect(r.suggestedUnitPrice).toBe(137.5);
    expect(r.unitPrice).toBe(137.5);
    expect(r.totalPrice).toBe(275);
  });
  it("honours an explicit unit-price override", () => {
    const r = computeLineItem(components, 150);
    expect(r.suggestedUnitPrice).toBe(137.5);
    expect(r.unitPrice).toBe(150);
    expect(r.totalPrice).toBe(300);
  });
  it("ignores a null/NaN override and uses the suggested price", () => {
    expect(computeLineItem(components, null).unitPrice).toBe(137.5);
    expect(computeLineItem(components, Number.NaN).unitPrice).toBe(137.5);
  });
  it("rounds a high-precision override to cents before computing the total", () => {
    // Guards client/server parity: the editor and saveQuoteDraft must both round
    // a manually-typed price like 107.335 to 107.34 before multiplying by qty.
    const r = computeLineItem(components, 107.335);
    expect(r.unitPrice).toBe(107.34);
    expect(r.totalPrice).toBe(214.68); // 107.34 * 2, not 107.335 * 2 = 214.67
  });
});

describe("computeQuoteTotals", () => {
  it("sums line totals and applies tax", () => {
    const t = computeQuoteTotals({ lineTotals: [100, 200, 50], taxPercent: 8.25 });
    expect(t.subtotal).toBe(350);
    expect(t.taxAmount).toBe(28.88); // 350 * 0.0825 = 28.875 -> 28.88
    expect(t.total).toBe(378.88);
  });
  it("handles zero tax", () => {
    const t = computeQuoteTotals({ lineTotals: [10, 20], taxPercent: 0 });
    expect(t).toEqual({ subtotal: 30, taxAmount: 0, total: 30 });
  });
  it("ignores non-finite line totals", () => {
    const t = computeQuoteTotals({ lineTotals: [10, Number.NaN, 5], taxPercent: 0 });
    expect(t.subtotal).toBe(15);
  });
});

describe("computeQuoteFromLines", () => {
  it("computes per-line and overall totals end to end", () => {
    const result = computeQuoteFromLines(
      [
        { quantity: 2, materialCost: 20, laborMinutes: 60, laborRate: 90, markupPercent: 25 },
        {
          quantity: 1,
          materialCost: 0,
          laborMinutes: 60,
          laborRate: 90,
          markupPercent: 0,
          unitPriceOverride: 100,
        },
      ],
      10
    );
    expect(result.lines[0].totalPrice).toBe(275);
    expect(result.lines[1].unitPrice).toBe(100);
    expect(result.subtotal).toBe(375);
    expect(result.taxAmount).toBe(37.5);
    expect(result.total).toBe(412.5);
  });
});
