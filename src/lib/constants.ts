/** Shared domain constants for ServiceQuote AI. */

export const APP_NAME = "ServiceQuote AI";
export const APP_TAGLINE =
  "Create professional service quotes in minutes, not hours.";

// ---------------------------------------------------------------------------
// Organisation / membership
// ---------------------------------------------------------------------------

export const ORG_ROLES = ["owner", "admin", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

/** Roles allowed to create/update price book, customers and quotes. */
export const EDITOR_ROLES: OrgRole[] = ["owner", "admin"];

// ---------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------

export const TRADES = [
  "electrical",
  "hvac",
  "plumbing",
  "landscaping",
  "roofing",
  "handyman",
] as const;
export type Trade = (typeof TRADES)[number];

export const TRADE_LABELS: Record<Trade, string> = {
  electrical: "Electrical",
  hvac: "HVAC",
  plumbing: "Plumbing",
  landscaping: "Landscaping",
  roofing: "Roofing",
  handyman: "Handyman",
};

export const COUNTRIES = ["United States", "Canada", "Other"] as const;

export const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "AUD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "$",
};

// ---------------------------------------------------------------------------
// Quotes — status lifecycle lives in src/lib/quotes/status.ts (single source of
// truth); re-exported here so existing import sites keep working.
// ---------------------------------------------------------------------------

export {
  QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_TRANSITIONS,
  QUOTE_STATUS_BADGE_VARIANT,
  EDITABLE_QUOTE_STATUSES,
  canTransitionQuoteStatus,
  getAllowedTransitions,
  getQuoteStatusLabel,
  getQuoteStatusBadgeVariant,
  getTransitionActionLabel,
  isQuoteEditable,
  isQuoteStatus,
} from "@/lib/quotes/status";
export type { QuoteStatus, QuoteStatusBadgeVariant } from "@/lib/quotes/status";

export const AI_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type AiStatus = (typeof AI_STATUSES)[number];

export const QUOTE_EVENT_TYPES = [
  "created",
  "ai_generated",
  "edited",
  "status_changed",
  "proposal_generated",
  "pdf_generated",
  "pdf_downloaded",
  "customer_message_copied",
  "quote_duplicated",
  "quote_sent",
  "quote_emailed",
  "proposal_viewed",
  "customer_accepted",
  "customer_declined",
  "invitation_sent",
  "invitation_accepted",
  "invitation_revoked",
] as const;
export type QuoteEventType = (typeof QUOTE_EVENT_TYPES)[number];

/** Customer response captured from the public shared proposal page. */
export const CUSTOMER_RESPONSES = ["accepted", "declined"] as const;
export type CustomerResponse = (typeof CUSTOMER_RESPONSES)[number];

// ---------------------------------------------------------------------------
// Price book
// ---------------------------------------------------------------------------

export const PRICE_BOOK_UNITS = [
  "each",
  "hour",
  "job",
  "ft",
  "sq ft",
  "linear ft",
  "unit",
  "set",
] as const;

export const PRICE_BOOK_SOURCES = ["manual", "ai", "import", "seed"] as const;
export type PriceBookSource = (typeof PRICE_BOOK_SOURCES)[number];

/** Suggested price book categories (free text is still allowed). */
export const PRICE_BOOK_CATEGORIES = [
  "labor",
  "materials",
  "installation",
  "repair",
  "inspection",
  "service_call",
  "permit",
  "other",
] as const;
export type PriceBookCategory = (typeof PRICE_BOOK_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Pricing / plans
// ---------------------------------------------------------------------------

export type PlanId = "starter" | "pro" | "team";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  blurb: string;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 39,
    blurb: "For solo contractors who want faster, sharper quotes.",
    features: [
      "Unlimited editable quotes",
      "AI draft from job notes (mock or real)",
      "Your price book — your prices",
      "Branded PDF proposals",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    blurb: "For growing shops sending quotes every day.",
    features: [
      "Everything in Starter",
      "Customer history & quote pipeline",
      "Quote status tracking",
      "Priority email support",
    ],
    highlighted: true,
  },
  {
    id: "team",
    name: "Team",
    price: 199,
    blurb: "For teams with multiple estimators (multi-user placeholder).",
    features: [
      "Everything in Pro",
      "Multiple team members (placeholder)",
      "Shared price book",
      "Onboarding call",
    ],
  },
];

export const SETUP_SERVICE = {
  id: "setup",
  name: "Done-for-you setup",
  price: 199,
  blurb:
    "One-time concierge onboarding: we build your price book and your first quotes with you.",
};

// ---------------------------------------------------------------------------
// Entitlements & usage limits
//
// Free (no active paid subscription) organizations can create a limited number
// of quotes and a small number of AI drafts per day so unconfigured / abandoned
// accounts can't run up real AI cost. Any active paid plan lifts the quote cap
// (null = unlimited) and raises the daily AI quota. Enforcement is server-side
// in src/lib/actions/quotes.ts via the pure helpers in src/lib/billing/
// entitlements.ts and src/lib/ai/quota.ts.
// ---------------------------------------------------------------------------

/** Quotes an org may create with no active paid plan. null = unlimited. */
export const FREE_QUOTE_LIMIT = 5;

/** Per-plan quote caps (null = unlimited). Free tier uses FREE_QUOTE_LIMIT. */
export const PLAN_QUOTE_LIMITS: Record<PlanId, number | null> = {
  starter: null,
  pro: null,
  team: null,
};

/** AI draft generations allowed per org per UTC day. */
export const AI_DAILY_QUOTA = { free: 8, paid: 100 } as const;

/** Subscription statuses that count as an entitled, paying customer. */
export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"] as const;

// ---------------------------------------------------------------------------
// Team invitations
// ---------------------------------------------------------------------------

/** Roles an existing editor may invite a teammate as (never another owner). */
export const INVITABLE_ROLES = ["admin", "member"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const INVITATION_STATUSES = ["pending", "accepted", "revoked"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/** Pending invitations expire after this many days. */
export const INVITATION_EXPIRY_DAYS = 14;

// ---------------------------------------------------------------------------
// Disclaimers
// ---------------------------------------------------------------------------

export const AI_ESTIMATE_DISCLAIMER =
  "This is an AI-assisted estimate. Review all prices before sending.";

export const PRICING_NOT_GUARANTEED =
  "ServiceQuote AI helps you draft and format quotes. It does not guarantee pricing accuracy — you set and review every price.";

export const DEFAULT_PROPOSAL_FOOTER =
  "Thank you for the opportunity to earn your business. This quote is an estimate and may change if job conditions differ from those described.";

/** Shown on the quote detail page above status actions. */
export const QUOTE_REVIEW_DISCLAIMER =
  "Review pricing and scope before sending. ServiceQuote AI assists with estimates but does not guarantee pricing accuracy.";

/** Printed on every branded proposal. */
export const PROPOSAL_DISCLAIMER =
  "This proposal is an estimate based on the information provided. Final pricing may change if site conditions, scope, materials, or customer requirements change. Please review and approve before work begins.";

/** Shown to the user when AI draft generation fails entirely. */
export const AI_FALLBACK_MESSAGE =
  "We could not generate a quote draft. You can still add line items manually.";
