# Product Requirements — ServiceQuote AI (MVP)

## 1. Problem

Service contractors (electricians, HVAC techs) lose jobs because quoting is slow.
After a site visit they have to write up an estimate — look up prices, type line
items, format a proposal — usually at night, often days late. The contractor who
quotes first frequently wins. Existing tools are heavy field-service platforms
that are overkill for "I just need to send a clean quote faster."

## 2. Target user

US service contractors, **starting with electrical and HVAC**, typically solo or
small shops (1–10 people). Comfortable with a phone and a laptop; not looking for
a CRM. Values speed, professionalism, and keeping control of their own prices.

## 3. Value proposition

> Turn job notes into an editable, line-item estimate and a branded proposal in
> minutes — using your own prices.

## 4. MVP scope

### In scope

1. Marketing site (landing + pricing + legal).
2. Email/password auth (Supabase) + first-run onboarding.
3. Business profile: trade, contact, branding, pricing defaults.
4. **Price book** management (CRUD, CSV import, examples) — the accuracy layer.
5. **Customers** (lightweight CRUD; created inline during quoting too).
6. **Quote flow**: customer → job notes → AI draft → editable quote → proposal.
7. AI extraction via a provider abstraction (mock/OpenAI/Anthropic), Zod-validated.
8. Editable line items with **live** totals (materials, labor, markup, tax).
9. **Branded proposal PDF** (print-optimized page → "Save as PDF").
10. Quote detail: status lifecycle, event timeline, copyable customer message.
11. Pricing/billing with a clean Stripe abstraction (degrades gracefully).
12. Internal admin (cross-org debug, service-role gated).

### Explicitly out of scope (v1)

- Scheduling / dispatch.
- Full CRM (pipelines, tasks, automations).
- Native mobile app.
- Multi-trade complexity / trade-specific catalogs beyond starter examples.
- QuickBooks / Xero / accounting sync.
- Auto-sending quotes without user confirmation.
- Any guaranteed-pricing claim.

## 5. Core user stories

- As a contractor, I can sign up and set up my business in ~2 minutes.
- As a contractor, I can build a price book (or load examples / import CSV).
- As a contractor, I can describe a job in plain English and get a draft quote.
- As a contractor, I can edit every line — quantity, costs, markup, price — and
  watch the totals update live.
- As a contractor, I can generate a branded PDF proposal with my logo and terms.
- As a contractor, I can track a quote's status (draft → sent → accepted/rejected)
  and copy a ready-to-send message to the customer.
- As the founder, I can manually onboard early customers and debug their data.

## 6. Non-functional requirements

- **Runs with an empty `.env`** (mock AI, on-screen setup notices) for fast local
  evaluation and demos.
- **Data isolation** per organization via RLS — no cross-org leakage.
- **Correctness** of money math is unit-tested.
- **Mobile responsive**, clean enterprise SaaS UI (white/gray/blue).
- **Editable-first**: AI never finalizes a price.

## 7. Success / acceptance criteria

A user can: sign up/login → create an organization → add price book items →
create a customer → describe a job → generate a structured draft (mock or real
AI) → edit all line items with correct totals → generate a branded proposal/PDF.
Data is org-scoped. Calculation + AI-schema tests pass. Docs are complete.

## 8. Pricing

| Plan | Price | For |
| --- | --- | --- |
| Starter | $39/mo | Solo contractors |
| Pro | $99/mo | Growing shops (most popular) |
| Team | $199/mo | Multiple estimators (placeholder multi-user) |
| Done-for-you setup | $199 one-time | Concierge onboarding |

## 9. Risks & mitigations

- **Pricing accuracy** → never guaranteed; price book is the source of truth;
  AI lowers confidence and leaves prices null when unsure.
- **AI reliability** → strict Zod schema + automatic mock fallback.
- **Adoption** → validation-first rollout (see `VALIDATION_PLAN.md`): manual
  onboarding, proof of payment before scaling.
