import { describe, it, expect } from "vitest";
import {
  quoteExtractionSchema,
  extractQuoteRequestSchema,
} from "@/lib/ai/schemas/quote-extraction";
import { mockExtractQuote } from "@/lib/ai/providers/mock";

describe("quoteExtractionSchema — new guardrail fields", () => {
  it("defaults cannot_price_items and missing_information to empty arrays", () => {
    const parsed = quoteExtractionSchema.parse({ suggested_line_items: [{ name: "Labor" }] });
    expect(parsed.cannot_price_items).toEqual([]);
    expect(parsed.missing_information).toEqual([]);
  });

  it("accepts populated guardrail fields", () => {
    const parsed = quoteExtractionSchema.parse({
      suggested_line_items: [{ name: "Custom fabrication" }],
      cannot_price_items: ["Custom fabrication"],
      missing_information: ["Measurements"],
      risk_flags: ["Permit may be required"],
      questions_for_contractor: ["Customer-supplied materials?"],
      confidence: 0.3,
    });
    expect(parsed.cannot_price_items).toContain("Custom fabrication");
    expect(parsed.missing_information).toContain("Measurements");
  });

  it("still rejects malformed output (confidence out of range)", () => {
    expect(() =>
      quoteExtractionSchema.parse({ confidence: 2, suggested_line_items: [] })
    ).toThrow();
  });

  it("still rejects a line item missing a name", () => {
    expect(() =>
      quoteExtractionSchema.parse({ suggested_line_items: [{ quantity: 1 }] })
    ).toThrow();
  });
});

describe("mockExtractQuote — guardrails", () => {
  const req = (jobDescription: string) =>
    extractQuoteRequestSchema.parse({
      context: { businessName: "Test", trade: "electrical", defaultLaborRate: 95, defaultMarkupPercent: 20 },
      jobDescription,
      jobLocation: null,
      priceBook: [],
    });

  it("always returns missing_information and arrays for the new fields", () => {
    const out = mockExtractQuote(req("Install two GFCI outlets."));
    expect(Array.isArray(out.cannot_price_items)).toBe(true);
    expect(out.missing_information.length).toBeGreaterThan(0);
    expect(() => quoteExtractionSchema.parse(out)).not.toThrow();
  });

  it("produces a low-confidence draft for vague notes", () => {
    const out = mockExtractQuote(req("Customer needs some help, not sure what yet."));
    expect(out.confidence).toBeLessThan(0.5);
    // Still gives the contractor an editable starting point.
    expect(out.suggested_line_items.length).toBeGreaterThan(0);
  });
});
