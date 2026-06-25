import { describe, it, expect } from "vitest";
import {
  quoteExtractionSchema,
  extractQuoteRequestSchema,
} from "@/lib/ai/schemas/quote-extraction";
import { mockExtractQuote } from "@/lib/ai/providers/mock";

describe("quoteExtractionSchema", () => {
  it("accepts a complete, valid extraction", () => {
    const valid = {
      job_type: "Electrical job",
      scope_summary: "Install two outlets.",
      assumptions: ["Normal hours"],
      exclusions: ["Permits"],
      suggested_line_items: [
        {
          category: "Devices",
          name: "Install GFCI",
          description: null,
          quantity: 2,
          unit: "each",
          matched_price_book_item_id: null,
          suggested_material_cost: 18,
          suggested_labor_minutes: 45,
          confidence: 0.8,
          reason: "from notes",
        },
      ],
      risk_flags: [],
      questions_for_contractor: [],
      confidence: 0.8,
    };
    expect(() => quoteExtractionSchema.parse(valid)).not.toThrow();
  });

  it("applies defaults for missing optional fields", () => {
    const parsed = quoteExtractionSchema.parse({
      suggested_line_items: [{ name: "Labor" }],
    });
    expect(parsed.job_type).toBe("General service");
    expect(parsed.assumptions).toEqual([]);
    expect(parsed.suggested_line_items[0].quantity).toBe(1);
    expect(parsed.suggested_line_items[0].unit).toBe("each");
    expect(parsed.suggested_line_items[0].confidence).toBe(0.5);
  });

  it("rejects a line item without a name", () => {
    const bad = { suggested_line_items: [{ quantity: 1 }] };
    expect(() => quoteExtractionSchema.parse(bad)).toThrow();
  });

  it("rejects confidence outside 0..1", () => {
    expect(() =>
      quoteExtractionSchema.parse({ confidence: 1.5, suggested_line_items: [] })
    ).toThrow();
  });

  it("rejects a non-uuid matched_price_book_item_id", () => {
    const bad = {
      suggested_line_items: [{ name: "x", matched_price_book_item_id: "not-a-uuid" }],
    };
    expect(() => quoteExtractionSchema.parse(bad)).toThrow();
  });
});

describe("mockExtractQuote", () => {
  const baseReq = {
    context: {
      businessName: "Test Electric",
      trade: "electrical",
      defaultLaborRate: 95,
      defaultMarkupPercent: 20,
    },
    jobLocation: null,
    priceBook: [],
  };

  it("produces schema-valid output for electrical notes", () => {
    const req = extractQuoteRequestSchema.parse({
      ...baseReq,
      jobDescription: "Install two new GFCI outlets in the kitchen and add a light fixture.",
    });
    const out = mockExtractQuote(req);
    expect(() => quoteExtractionSchema.parse(out)).not.toThrow();
    const names = out.suggested_line_items.map((i) => i.name);
    expect(names).toContain("Install outlet / GFCI receptacle");
    expect(names).toContain("Install light fixture");
  });

  it("is deterministic — same input yields same output", () => {
    const req = extractQuoteRequestSchema.parse({
      ...baseReq,
      jobDescription: "Replace the electrical panel and run a new circuit.",
    });
    expect(mockExtractQuote(req)).toEqual(mockExtractQuote(req));
  });

  it("falls back to a labor placeholder for vague notes", () => {
    const req = extractQuoteRequestSchema.parse({
      ...baseReq,
      jobDescription: "Customer needs some help, not sure exactly what yet.",
    });
    const out = mockExtractQuote(req);
    expect(out.suggested_line_items).toHaveLength(1);
    expect(out.suggested_line_items[0].name).toBe("General labor");
  });

  it("matches against the price book when an item lines up", () => {
    const req = extractQuoteRequestSchema.parse({
      ...baseReq,
      jobDescription: "Install a light fixture in the hallway.",
      priceBook: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          name: "Install light fixture",
          category: "Fixtures",
          unit: "each",
          material_cost: 30,
          labor_minutes: 50,
        },
      ],
    });
    const out = mockExtractQuote(req);
    const fixture = out.suggested_line_items.find((i) => i.name.includes("light fixture"));
    expect(fixture?.matched_price_book_item_id).toBe(
      "11111111-1111-1111-1111-111111111111"
    );
    expect(fixture?.suggested_material_cost).toBe(30);
  });
});
