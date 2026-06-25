import type { Quote, QuoteLineItem, Customer, Organization } from "@/lib/types/db";
import { computeLineTotal, round2 } from "@/lib/quotes/calculations";
import { DEFAULT_PROPOSAL_FOOTER, PROPOSAL_DISCLAIMER } from "@/lib/constants";

/**
 * Pure proposal data mapper. Turns the persisted quote + line items + org +
 * customer into a normalized view model the print page renders. Pure + typed so
 * it is unit-tested (missing optional fields, long descriptions, totals) without
 * a browser or DB.
 */

export interface ProposalLineView {
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface ProposalView {
  business: {
    name: string;
    logoUrl: string | null;
    contactLines: string[]; // address, city/state, phone, website, email
    licenseText: string | null;
    googleReviewUrl: string | null;
  };
  quoteNumber: string;
  quoteDate: string | null;
  validUntil: string | null;
  jobLocation: string | null;
  customer: {
    name: string;
    addressLines: string[];
    email: string | null;
    phone: string | null;
  } | null;
  title: string;
  scopeSummary: string | null;
  assumptions: string | null;
  exclusions: string | null;
  lineItems: ProposalLineView[];
  currency: string;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  disclaimer: string;
  footer: string;
}

export interface BuildProposalInput {
  quote: Quote;
  lineItems: QuoteLineItem[];
  organization: Pick<
    Organization,
    | "name"
    | "logo_url"
    | "address"
    | "city"
    | "state"
    | "phone"
    | "website"
    | "default_currency"
    | "proposal_footer"
    | "license_text"
    | "google_review_url"
  > & { email?: string | null };
  customer: Customer | null;
  jobLocation?: string | null;
}

function compact(values: Array<string | null | undefined>): string[] {
  return values.map((v) => (v ?? "").trim()).filter((v) => v.length > 0);
}

export function buildProposalView({
  quote,
  lineItems,
  organization,
  customer,
  jobLocation,
}: BuildProposalInput): ProposalView {
  const currency = quote.currency || organization.default_currency || "USD";

  const businessContact = compact([
    organization.address,
    compact([organization.city, organization.state]).join(", "),
    organization.phone,
    organization.website,
    organization.email ?? null,
  ]);

  const customerView = customer
    ? {
        name: customer.name,
        addressLines: compact([
          customer.address,
          compact([customer.city, customer.state]).join(", ") +
            (customer.postal_code ? ` ${customer.postal_code}` : ""),
        ]),
        email: customer.email,
        phone: customer.phone,
      }
    : null;

  const lines: ProposalLineView[] = lineItems.map((li) => {
    const unitPrice = round2(Number(li.unit_price) || 0);
    const quantity = Number(li.quantity) || 0;
    return {
      name: li.name,
      description: li.description,
      quantity,
      unit: li.unit || "each",
      unitPrice,
      total: computeLineTotal(unitPrice, quantity),
    };
  });

  return {
    business: {
      name: organization.name,
      logoUrl: organization.logo_url,
      contactLines: businessContact,
      licenseText: organization.license_text,
      googleReviewUrl: organization.google_review_url,
    },
    quoteNumber: quote.quote_number || "Draft",
    quoteDate: quote.created_at ?? null,
    validUntil: quote.valid_until,
    jobLocation: (jobLocation ?? "").trim() || null,
    customer: customerView,
    title: quote.title || "Service quote",
    scopeSummary: quote.scope_summary,
    assumptions: quote.assumptions,
    exclusions: quote.exclusions,
    lineItems: lines,
    currency,
    subtotal: round2(Number(quote.subtotal) || 0),
    taxPercent: Number(quote.tax_percent) || 0,
    taxAmount: round2(Number(quote.tax_amount) || 0),
    total: round2(Number(quote.total) || 0),
    disclaimer: PROPOSAL_DISCLAIMER,
    footer: organization.proposal_footer || DEFAULT_PROPOSAL_FOOTER,
  };
}

/** Contractor-friendly message to paste alongside the proposal. */
export function buildCustomerMessage(
  customerName: string | null | undefined,
  quoteTitle: string | null | undefined,
  businessName: string
): string {
  const who = (customerName ?? "").trim() || "there";
  const what = (quoteTitle ?? "").trim() || "your project";
  return (
    `Hi ${who}, attached is the proposal for ${what}. ` +
    `Please review the scope, pricing, assumptions, and exclusions. ` +
    `Let me know if you would like any changes. — ${businessName}`
  );
}
