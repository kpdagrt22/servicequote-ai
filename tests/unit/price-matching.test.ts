import { describe, it, expect } from "vitest";
import { tokenize, scoreMatch, findBestMatch } from "@/lib/price-book/matching";
import type { PriceBookRef } from "@/lib/ai/schemas/quote-extraction";

const ref = (id: string, name: string, category: string | null = null): PriceBookRef => ({
  id,
  name,
  category,
  unit: "each",
  material_cost: null,
  labor_minutes: null,
});

describe("tokenize", () => {
  it("drops stop words and short tokens", () => {
    expect(tokenize("Install a new GFCI outlet")).toEqual(["gfci", "outlet"]);
  });
  it("lowercases and strips punctuation", () => {
    expect(tokenize("Panel/Breaker, 200-amp!")).toEqual(["panel", "breaker", "200", "amp"]);
  });
});

describe("scoreMatch", () => {
  it("scores an exact phrase highly", () => {
    const score = scoreMatch("Install light fixture", ref("a", "Install light fixture"));
    expect(score).toBeGreaterThan(0.6);
  });
  it("scores unrelated items near zero", () => {
    const score = scoreMatch("water heater replacement", ref("a", "Mulch installation"));
    expect(score).toBeLessThan(0.34);
  });
});

describe("findBestMatch", () => {
  const book = [
    ref("1", "Install light fixture", "Fixtures"),
    ref("2", "Install outlet / GFCI receptacle", "Devices"),
    ref("3", "Electrical panel / breaker work", "Service"),
  ];

  it("returns the best matching item above threshold", () => {
    const m = findBestMatch("Install a GFCI receptacle outlet", book);
    expect(m?.item.id).toBe("2");
  });

  it("returns null when nothing clears the threshold", () => {
    expect(findBestMatch("paint the fence", book)).toBeNull();
  });

  it("returns null for an empty price book", () => {
    expect(findBestMatch("anything", [])).toBeNull();
  });
});
