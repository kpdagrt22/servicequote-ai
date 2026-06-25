import { z } from "zod";

/**
 * Structured output contract for the AI quote-extraction step.
 *
 * Given a contractor's free-text job notes (plus business context and their
 * price book), the AI returns a structured draft: a scope summary, assumptions,
 * exclusions, and a list of suggested line items it can optionally match to
 * existing price book items. This schema is the boundary every provider
 * (mock / openai / anthropic) must honour and is validated with Zod so a
 * malformed model response can never reach the editor or the database.
 *
 * IMPORTANT: this is a DRAFT. The contractor edits every line and price before
 * anything is sent. The AI never finalises pricing.
 */

/** One AI-suggested line item. Prices are intentionally soft — the user edits. */
export const suggestedLineItemSchema = z.object({
  category: z.string().nullable().default(null),
  name: z.string().min(1, "Line item needs a name"),
  description: z.string().nullable().default(null),
  quantity: z.number().nonnegative().default(1),
  unit: z.string().nullable().default("each"),
  /** Optional id of a price book item the AI believes this maps to. */
  matched_price_book_item_id: z.string().uuid().nullable().default(null),
  /** AI suggested material cost per unit, when it could estimate one. */
  suggested_material_cost: z.number().nonnegative().nullable().default(null),
  /** AI suggested labor minutes per unit. */
  suggested_labor_minutes: z.number().nonnegative().nullable().default(null),
  confidence: z.number().min(0).max(1).default(0.5),
  reason: z.string().nullable().default(null),
});
export type SuggestedLineItem = z.infer<typeof suggestedLineItemSchema>;

export const quoteExtractionSchema = z.object({
  job_type: z.string().default("General service"),
  scope_summary: z.string().default(""),
  assumptions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  suggested_line_items: z.array(suggestedLineItemSchema).default([]),
  /** Things the contractor should double-check (access, permits, hidden damage). */
  risk_flags: z.array(z.string()).default([]),
  /** Clarifying questions to ask the customer before committing. */
  questions_for_contractor: z.array(z.string()).default([]),
  /** Overall confidence in the extraction (0-1). */
  confidence: z.number().min(0).max(1).default(0.5),
});
export type QuoteExtraction = z.infer<typeof quoteExtractionSchema>;

// --- Input shapes -----------------------------------------------------------

/** A trimmed price book item the model can match against. */
export const priceBookRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable().default(null),
  unit: z.string().nullable().default(null),
  material_cost: z.number().nullable().default(null),
  labor_minutes: z.number().nullable().default(null),
});
export type PriceBookRef = z.infer<typeof priceBookRefSchema>;

export const extractionContextSchema = z.object({
  businessName: z.string().default("our business"),
  trade: z.string().default("handyman"),
  defaultLaborRate: z.number().nullable().default(null),
  defaultMarkupPercent: z.number().nullable().default(null),
});
export type ExtractionContext = z.infer<typeof extractionContextSchema>;

export const extractQuoteRequestSchema = z.object({
  context: extractionContextSchema,
  jobDescription: z.string().min(1, "Describe the job to generate a draft."),
  jobLocation: z.string().nullable().default(null),
  priceBook: z.array(priceBookRefSchema).default([]),
});
export type ExtractQuoteRequest = z.infer<typeof extractQuoteRequestSchema>;
