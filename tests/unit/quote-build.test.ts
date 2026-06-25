import { describe, it, expect } from "vitest";
import { lineItemFromSuggestion, listToText } from "@/lib/quotes/build";
import type { SuggestedLineItem } from "@/lib/ai/schemas/quote-extraction";
import type { PriceBookItem } from "@/lib/types/db";

const suggestion = (over: Partial<SuggestedLineItem> = {}): SuggestedLineItem => ({
  category: "Devices",
  name: "Install GFCI",
  description: "Kitchen outlet",
  quantity: 2,
  unit: "each",
  matched_price_book_item_id: null,
  suggested_material_cost: 18,
  suggested_labor_minutes: 45,
  confidence: 0.8,
  reason: "from notes",
  ...over,
});

const pbItem = (over: Partial<PriceBookItem> = {}): PriceBookItem => ({
  id: "11111111-1111-1111-1111-111111111111",
  organization_id: "org",
  trade: "electrical",
  category: "Devices",
  name: "GFCI receptacle",
  description: null,
  unit: "each",
  default_quantity: 1,
  material_cost: 20,
  labor_minutes: 40,
  markup_percent: 25,
  price_override: null,
  active: true,
  source: "manual",
  created_at: "",
  updated_at: "",
  ...over,
});

describe("lineItemFromSuggestion", () => {
  it("uses suggestion values + org defaults when no price book match", () => {
    const li = lineItemFromSuggestion(suggestion(), undefined, { laborRate: 100, markupPercent: 20 }, 0);
    expect(li.material_cost).toBe(18);
    expect(li.labor_minutes).toBe(45);
    expect(li.labor_rate).toBe(100);
    expect(li.markup_percent).toBe(20);
    // unit cost = 18 + (45/60 * 100 = 75) = 93; +20% = 111.6
    expect(li.unit_price).toBe(111.6);
    expect(li.total_price).toBe(223.2); // * qty 2
    expect(li.ai_generated).toBe(true);
  });

  it("prefers the matched price book item's cost, labor and markup", () => {
    const li = lineItemFromSuggestion(suggestion(), pbItem(), { laborRate: 100, markupPercent: 20 }, 1);
    expect(li.price_book_item_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(li.material_cost).toBe(20);
    expect(li.labor_minutes).toBe(40);
    expect(li.markup_percent).toBe(25); // from price book, not the org default
    // cost = 20 + (40/60*100 = 66.67) = 86.67; +25% = 108.34
    expect(li.unit_price).toBe(108.34);
    expect(li.sort_order).toBe(1);
  });

  it("honours a price book price_override", () => {
    const li = lineItemFromSuggestion(suggestion(), pbItem({ price_override: 150 }), { laborRate: 100, markupPercent: 20 }, 0);
    expect(li.unit_price).toBe(150);
    expect(li.total_price).toBe(300);
  });
});

describe("listToText", () => {
  it("bullets non-empty items", () => {
    expect(listToText(["A", " ", "B"])).toBe("• A\n• B");
  });
  it("returns null for an empty list", () => {
    expect(listToText([])).toBeNull();
    expect(listToText(["", "  "])).toBeNull();
  });
});
