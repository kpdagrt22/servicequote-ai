# AI Workflow — ServiceQuote AI

The AI's only job is to turn a contractor's free-text job notes into a
**structured draft quote** the contractor then edits. It never finalizes prices.

## Provider abstraction

```
src/lib/ai/
  schemas/quote-extraction.ts   Zod contract (input + output)
  prompt.ts                     shared system/user prompt builder
  providers/
    mock.ts                     deterministic, no network (default)
    openai.ts                   Chat Completions JSON mode (fetch)
    anthropic.ts                Messages API (fetch)
  service.ts                    extractQuote(): route + validate + fallback
```

Provider selection (`src/lib/config.ts → aiConfig.effectiveProvider`):

- `AI_PROVIDER=mock` (or unset) → **mock**.
- `AI_PROVIDER=openai` **and** `OPENAI_API_KEY` set → OpenAI.
- `AI_PROVIDER=anthropic` **and** `ANTHROPIC_API_KEY` set → Anthropic.
- A real provider selected without its key → silently uses **mock**.

## The contract

### Input (`extractQuoteRequestSchema`)

```ts
{
  context: { businessName, trade, defaultLaborRate, defaultMarkupPercent },
  jobDescription: string,         // the contractor's notes (required)
  jobLocation: string | null,
  priceBook: PriceBookRef[]       // active items to match against
}
```

### Output (`quoteExtractionSchema`)

```ts
{
  job_type: string,
  scope_summary: string,
  assumptions: string[],
  exclusions: string[],
  suggested_line_items: Array<{
    category, name, description,
    quantity, unit,
    matched_price_book_item_id: uuid | null,
    suggested_material_cost: number | null,
    suggested_labor_minutes: number | null,
    confidence: 0..1,
    reason
  }>,
  risk_flags: string[],
  questions_for_contractor: string[],
  confidence: 0..1
}
```

Every provider's output is parsed by `quoteExtractionSchema` **before** it can
reach the editor or the database. Malformed output throws and triggers the
fallback. `confidence` outside `0..1`, a missing line-item `name`, or a non-uuid
`matched_price_book_item_id` are all rejected (see `tests/unit/ai-extraction.test.ts`).

## Guardrails (encoded in `prompt.ts`)

- Produce a **draft only**; never imply pricing is final or guaranteed.
- Prefer the contractor's price book; set `matched_price_book_item_id` when a job
  item clearly maps to one and reuse its unit.
- Only suggest material costs / labor minutes that can be reasonably inferred;
  otherwise leave them `null` and lower confidence — **do not invent prices**.
- Surface anything that could move the price into `risk_flags`, and anything the
  customer must clarify into `questions_for_contractor`.

## End-to-end flow

1. `generateDraftQuote` (server action) builds the input from the org + the
   active price book and calls `extractQuote()`.
2. `extractQuote()` validates the request, routes to the effective provider,
   validates the response, and returns `{ ok, provider, model, extraction, error,
   usedFallback }`.
3. On any provider error it returns the **mock** extraction with
   `usedFallback: true` — the contractor is never blocked.
4. The result is written to `ai_extraction_logs` (provider, model, input, output,
   status, error) and summarized into a `quote_events` `ai_generated` row
   (confidence, risk flags, questions) shown in the quote's "AI insights" panel.

## The mock provider

`providers/mock.ts` is deterministic and rule-based:

- A small **trade-aware keyword library** (electrical/HVAC/plumbing/roofing/
  landscaping/handyman) maps notes → line items.
- Each candidate line is matched against the price book via
  `price-book/matching.ts` (token overlap); a match pulls real costs/unit and
  raises confidence.
- Vague notes still yield a "General labor" placeholder so there's always
  something to edit.
- Output is validated through the same `quoteExtractionSchema` as real providers.

Because it's deterministic (no randomness), the mock is fully unit-testable and
makes demos and local development work with **no API keys**.

## Pricing math (after extraction)

Once line items exist, all money math is handled by the pure functions in
`src/lib/quotes/calculations.ts`:

```
unit cost  = material_cost + (labor_minutes / 60) * labor_rate
unit price = unit cost * (1 + markup_percent / 100)   # unless overridden
line total = unit price * quantity
subtotal   = Σ line totals
tax        = subtotal * (tax_percent / 100)
total      = subtotal + tax
```

The editor recomputes these **live** using the same functions the server uses to
persist totals, so the preview always matches what's saved.

## Upgrading to a real provider

1. Set `AI_PROVIDER` and the matching API key.
2. (Optional) override the model via `AI_OPENAI_MODEL` / `AI_ANTHROPIC_MODEL`.
3. The providers currently use plain JSON-mode `fetch`. For production hardening,
   swap to the official SDK with tool/function calling for stricter structured
   output — the Zod schema stays the same.
