import { describe, it, expect } from "vitest";
import { buildProposalView, buildCustomerMessage, type BuildProposalInput } from "@/lib/quotes/proposal";
import { formatCurrency } from "@/lib/format";
import type { Quote, QuoteLineItem, Customer, Organization } from "@/lib/types/db";

const org = (over: Partial<Organization> = {}): BuildProposalInput["organization"] => ({
  name: "Sparks Electric",
  logo_url: null,
  address: "123 Main St",
  city: "Austin",
  state: "TX",
  phone: "(555) 123-4567",
  website: "sparkselectric.com",
  default_currency: "USD",
  proposal_footer: null,
  license_text: "Licensed & insured · Lic #12345",
  google_review_url: null,
  email: null,
  ...over,
});

const quote = (over: Partial<Quote> = {}): Quote => ({
  id: "q1",
  organization_id: "o1",
  customer_id: "c1",
  quote_request_id: null,
  quote_number: "Q-0007",
  title: "Recessed lighting install",
  scope_summary: "Install 6 recessed lights.",
  assumptions: "• Normal hours",
  exclusions: "• Permits",
  status: "draft",
  subtotal: 200,
  tax_percent: 8.25,
  tax_amount: 16.5,
  total: 216.5,
  currency: "USD",
  valid_until: "2026-07-26",
  pdf_url: null,
  created_at: "2026-06-26T00:00:00Z",
  updated_at: "2026-06-26T00:00:00Z",
  ...over,
});

const li = (over: Partial<QuoteLineItem> = {}): QuoteLineItem => ({
  id: "l1",
  quote_id: "q1",
  price_book_item_id: null,
  sort_order: 0,
  category: "Fixtures",
  name: "Recessed light",
  description: "Install + wire",
  quantity: 6,
  unit: "each",
  material_cost: 20,
  labor_minutes: 30,
  labor_rate: 90,
  markup_percent: 0,
  unit_price: 33.33,
  total_price: 199.98,
  ai_generated: true,
  confidence: 0.8,
  created_at: "",
  updated_at: "",
  ...over,
});

const customer = (over: Partial<Customer> = {}): Customer => ({
  id: "c1",
  organization_id: "o1",
  name: "Jane Homeowner",
  email: "jane@example.com",
  phone: "(555) 999-0000",
  address: "9 Oak Ave",
  city: "Austin",
  state: "TX",
  postal_code: "78701",
  notes: null,
  created_at: "",
  updated_at: "",
  ...over,
});

describe("buildProposalView", () => {
  it("maps business, customer, lines and totals", () => {
    const view = buildProposalView({
      quote: quote(),
      lineItems: [li()],
      organization: org(),
      customer: customer(),
      jobLocation: "9 Oak Ave, Austin TX",
    });
    expect(view.quoteNumber).toBe("Q-0007");
    expect(view.business.contactLines).toContain("123 Main St");
    expect(view.business.contactLines).toContain("Austin, TX");
    expect(view.customer?.name).toBe("Jane Homeowner");
    expect(view.jobLocation).toBe("9 Oak Ave, Austin TX");
    expect(view.lineItems[0].unit).toBe("each");
    expect(view.lineItems[0].total).toBe(199.98); // 33.33 * 6
    expect(view.disclaimer).toMatch(/estimate/i);
  });

  it("handles a missing customer (null)", () => {
    const view = buildProposalView({ quote: quote(), lineItems: [li()], organization: org(), customer: null });
    expect(view.customer).toBeNull();
  });

  it("handles missing optional org/customer fields without crashing", () => {
    const view = buildProposalView({
      quote: quote({ quote_number: null, scope_summary: null }),
      lineItems: [li({ description: null, unit: null })],
      organization: org({ logo_url: null, website: null, phone: null, address: null, city: null, state: null }),
      customer: customer({ email: null, phone: null, address: null, postal_code: null }),
    });
    expect(view.quoteNumber).toBe("Draft");
    expect(view.scopeSummary).toBeNull();
    expect(view.lineItems[0].unit).toBe("each"); // defaulted
    expect(view.business.contactLines.length).toBeGreaterThanOrEqual(0);
  });

  it("preserves long line descriptions (no truncation in the model)", () => {
    const long = "x".repeat(500);
    const view = buildProposalView({ quote: quote(), lineItems: [li({ description: long })], organization: org(), customer: null });
    expect(view.lineItems[0].description).toBe(long);
  });

  it("rounds high-precision unit prices before computing the amount", () => {
    const view = buildProposalView({
      quote: quote(),
      lineItems: [li({ unit_price: 107.335, quantity: 2 })],
      organization: org(),
      customer: null,
    });
    expect(view.lineItems[0].unitPrice).toBe(107.34);
    expect(view.lineItems[0].total).toBe(214.68);
  });
});

describe("formatCurrency", () => {
  it("formats USD cleanly", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
    expect(formatCurrency(0, "USD")).toBe("$0.00");
  });
  it("never renders NaN", () => {
    expect(formatCurrency(NaN, "USD")).toBe("$0.00");
  });
  it("falls back for unknown currency codes", () => {
    const out = formatCurrency(10, "ZZZ");
    expect(out).toContain("10");
  });
});

describe("buildCustomerMessage", () => {
  it("includes customer, title and business", () => {
    const msg = buildCustomerMessage("Jane", "Recessed lighting", "Sparks Electric");
    expect(msg).toContain("Jane");
    expect(msg).toContain("Recessed lighting");
    expect(msg).toContain("Sparks Electric");
    expect(msg).toMatch(/scope, pricing, assumptions, and exclusions/);
  });
  it("falls back gracefully for missing name/title", () => {
    const msg = buildCustomerMessage(null, "", "Acme");
    expect(msg).toContain("there");
    expect(msg).toContain("your project");
  });
});
