import { describe, it, expect } from "vitest";
import { buildProposalEmail, escapeHtml } from "@/lib/email/proposal-email";

describe("escapeHtml", () => {
  it("escapes the dangerous characters", () => {
    expect(escapeHtml(`<script>"&'`)).toBe("&lt;script&gt;&quot;&amp;&#39;");
  });
});

describe("buildProposalEmail", () => {
  const base = {
    customerName: "Jane Homeowner",
    businessName: "Sparks Electric",
    quoteTitle: "Panel upgrade",
    quoteNumber: "Q-0007",
    totalFormatted: "$2,150.00",
    shareUrl: "https://app.example.com/p/tok123",
  };

  it("includes the customer, business, total and link", () => {
    const m = buildProposalEmail(base);
    expect(m.subject).toBe("Your quote from Sparks Electric (Q-0007)");
    expect(m.text).toContain("Jane Homeowner");
    expect(m.text).toContain("Panel upgrade");
    expect(m.text).toContain("$2,150.00");
    expect(m.text).toContain("https://app.example.com/p/tok123");
    expect(m.html).toContain("https://app.example.com/p/tok123");
  });

  it("falls back gracefully for missing name/title/number", () => {
    const m = buildProposalEmail({ ...base, customerName: null, quoteTitle: null, quoteNumber: null });
    expect(m.subject).toBe("Your quote from Sparks Electric");
    expect(m.text).toContain("there");
    expect(m.text).toContain("your project");
  });

  it("escapes HTML in the business/customer names (no injection)", () => {
    const m = buildProposalEmail({ ...base, businessName: "<b>Acme</b>", customerName: "<img src=x>" });
    expect(m.html).not.toContain("<b>Acme</b>");
    expect(m.html).toContain("&lt;b&gt;Acme&lt;/b&gt;");
    expect(m.html).not.toContain("<img src=x>");
  });
});
