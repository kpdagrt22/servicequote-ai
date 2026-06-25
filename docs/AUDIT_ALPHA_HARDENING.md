# Baseline Audit — Alpha Hardening

Date: 2026-06-26
Branch: `alpha-hardening-quote-lifecycle`
Baseline commit: `9a4bbe0` (initial ServiceQuote AI MVP)

This audit records the state of the repo **before** the alpha hardening changes,
across the 8 required dimensions. Severity: `info` / `low` / `med` / `high`.
"Fixed in this task" reflects work done on the `alpha-hardening-quote-lifecycle`
branch (see `docs/FINAL_ALPHA_AUDIT.md` for the post-change audit).

---

## 1. Quote lifecycle completeness — PARTIAL

| Capability | State | Evidence |
| --- | --- | --- |
| Draft quote | ✅ | `generateDraftQuote` sets `status:'draft'` (`src/lib/actions/quotes.ts`) |
| Generated quote (AI) | ✅ | `extractQuote` + line-item build (`src/lib/ai/service.ts`, `src/lib/quotes/build.ts`) |
| Edited quote | ✅ | `saveQuoteDraft` recomputes totals server-side |
| Proposal preview | ✅ | `src/app/proposal/[id]/print/page.tsx` |
| PDF generation | ✅ (print-to-PDF) | `PrintToolbar` → `window.print()` |
| Sent status | ✅ | `QUOTE_STATUSES` |
| Accepted/Rejected | ✅ | `QUOTE_STATUSES` |
| Event timeline | ✅ | `quote_events` + `QuoteTimeline` |
| Recalc after edits | ✅ | `computeQuoteTotals` (client + server) |
| **`ready` status** | ❌ missing | only draft/sent/accepted/rejected exist |
| **`archived` status** | ❌ missing | no way to hide dead quotes |
| **Duplicate quote** | ❌ missing | contractors re-quote similar jobs |
| **Centralized transition helper** | ⚠️ partial | transitions live in `constants.ts`, no `canTransition()` helper or badge-variant helper |

**Confirmed issues**
- `med` — No `ready`/`archived` statuses; lifecycle can't express "reviewed, ready to send" or "hide". → **Fixed in this task** (`src/lib/quotes/status.ts`, migration `0004`).
- `low` — No duplicate-quote action. → **Fixed in this task** (`duplicateQuote`).
- `low` — Transition logic not centralized as helpers. → **Fixed** (`status.ts`).

## 2. Calculation consistency — PASS (with additions)

- Pure engine in `src/lib/quotes/calculations.ts`; client (`QuoteWorkspace`) and
  server (`saveQuoteDraft`) both round unit price via `round2` before line totals
  (parity fix from prior audit). Tax/markup/labor/material correct and tested
  (`tests/unit/calculations.test.ts`, incl. high-precision 107.335 case).
- `info` — Requested helper names (`safeNumber`, `computeMarkupPrice`,
  `computeLaborCost`, `validateLineItemInput`) not yet present. → **Added in this task**.
- `low` — Negative line-item inputs are clamped (`Math.max(0, …)`) but not
  explicitly *rejected*/validated. → **Added** `validateLineItemInput` + tests.

## 3. Organization security — PASS

- RLS enabled on every table; helper fns `is_org_member`/`is_org_editor` are
  `SECURITY DEFINER` (`supabase/migrations/0002_rls.sql`). No cross-org path.
- Server actions re-check org ownership: `saveQuoteDraft`, `updateQuoteStatus`,
  `recordQuoteEvent`, `generateDraftQuote` (customer id) all filter by
  `organization_id` (prior-audit fixes present).
- `/admin` gated by `ADMIN_EMAILS` + service-role (`src/app/admin/page.tsx`).
- `info` — Ownership checks are duplicated inline per action. → **Centralized** into
  `src/lib/auth/organizations.ts` helpers in this task (no behavior weakened).

## 4. AI safety and schema validation — PASS (with additions)

- All provider output validated by `quoteExtractionSchema` (Zod); malformed
  output throws → `extractQuote` falls back to deterministic mock; never crashes.
- Mock is default and key-free; tests don't hit network.
- `low` — Schema lacks `cannot_price_items` and `missing_information`; risk flags
  & questions exist but no explicit "couldn't price X". → **Added** in this task.
- `low` — No user-facing fallback message constant. → **Added** `AI_FALLBACK_MESSAGE`.

## 5. Proposal / PDF quality — PARTIAL

- Branding, customer, scope, line items, assumptions/exclusions, totals,
  validity, disclaimer all present (`src/app/proposal/[id]/print/page.tsx`).
- `med` — Missing: **job location**, a dedicated **unit** column, and an
  **acceptance/signature block**. → **Fixed in this task**.
- `low` — Disclaimer is the generic `PRICING_NOT_GUARANTEED`; spec wants a
  fuller estimate disclaimer. → **Added** `PROPOSAL_DISCLAIMER`.
- `info` — No proposal data-mapper unit test. → **Added** `lib/quotes/proposal.ts` + tests.

## 6. Supabase deployment readiness — PARTIAL

- Migrations ordered (`0001`→`0003`); RLS + storage documented in `docs/DATABASE.md`,
  `docs/DEPLOYMENT.md`; seed at `supabase/seed/demo.sql`.
- `med` — No dedicated step-by-step `docs/SUPABASE_SETUP.md`. → **Added**.
- `low` — No runtime env validation / `verify:env`. → **Added** `src/lib/env.ts` + script.

## 7. Validation readiness — PARTIAL

- Founder can demo without API keys (mock AI) and load example price book items.
- `med` — No one-click demo data (org+customer+quote) and no founder demo script.
  → **Added** `seedDemoData` action + `docs/DEMO_SCRIPT.md`.
- `low` — Price book examples limited; spec wants fuller electrician/HVAC lists.
  → **Expanded** `src/lib/price-book/examples.ts`.

## 8. Git hygiene — PASS

- `.gitignore` excludes `node_modules`, `.env*`, `.next`, build artifacts;
  `.gitattributes` pins LF. No `.env`, secrets, or `node_modules` tracked
  (verified `git ls-files`). Only `.env.example` committed.

---

## Summary

| Dimension | Baseline | Target after task |
| --- | --- | --- |
| 1 Quote lifecycle | PARTIAL | PASS |
| 2 Calculations | PASS | PASS+ |
| 3 Org security | PASS | PASS+ |
| 4 AI safety | PASS | PASS+ |
| 5 Proposal/PDF | PARTIAL | PASS |
| 6 Supabase readiness | PARTIAL | PASS |
| 7 Validation readiness | PARTIAL | PASS |
| 8 Git hygiene | PASS | PASS |

No `high`-severity issues at baseline (prior audit already fixed the open
redirect, rounding mismatch, and two IDOR/data-integrity gaps). The hardening
work below closes the lifecycle, proposal, demo, and deployment gaps.
