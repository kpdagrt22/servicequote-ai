# Final Adversarial Audit — Alpha Hardening

Date: 2026-06-26
Branch: `alpha-hardening-quote-lifecycle`

Method: 8 read-only auditor agents (one per category) over the alpha changes,
each finding adversarially re-verified by a second agent before being accepted.
Three issues were confirmed and **all three were fixed in this branch** (then
re-verified: typecheck clean, 122 unit tests pass, `next build` succeeds).

| # | Category | Verdict | Evidence | Remaining risk | Blocks validation? |
| --- | --- | --- | --- | --- | --- |
| 1 | Security & IDOR | **PASS (after fix)** | All org-scoped actions derive org from session, validate ownership (`assertCustomerBelongsToOrg`/`assertQuoteBelongsToOrg`); `duplicateQuote` copies only the source org's lines. Open-redirect in auth callback fixed. | None known | No (fixed) |
| 2 | RLS / data isolation | PASS | All 5 event insert points scope `organization_id`; `0004` drops+re-adds `quotes_status_check` with all six statuses; correct migration order `0001→0004`; no cross-org path. | Storage bucket policies still permissive (documented future hardening). | No |
| 3 | Quote calculation correctness | **PASS (after fix)** | `safeNumber` blocks NaN/Infinity; `validateLineItemInput` rejects negatives; client/server round2 parity. Read-only display rounding fixed. | None known | No (fixed) |
| 4 | Quote status lifecycle | **PASS (after fix)** | `status.ts` SSOT; forbidden transitions blocked; DB CHECK == `QUOTE_STATUSES`. Server-side draft-only edit guard added. | None known | No (fixed) |
| 5 | AI failure handling & guardrails | PASS | Zod-validated; mock fallback never crashes; new fields default safely; prompt forbids guaranteed-pricing/legal/permit/code certainty; tests need no keys/network. | Real-provider output quality unverified until tested with a key (mock is the default). | No |
| 6 | Proposal / PDF + demo | PASS | All sections render incl. unit column, job location, signature block, disclaimer; missing data handled; `seedDemoData` editor-gated, current org only. | Unsupported trades fall back to electrical sample notes (cosmetic). | No |
| 7 | Product scope discipline | PASS | No scheduling/CRM/accounting/mobile/multi-trade creep; no auto-send path; every AI quote editable; pricing disclaimed. | None | No |
| 8 | Git hygiene & test coverage | PASS | `.gitignore`/`.gitattributes` correct; only `.env.example` committed; no secret patterns; tests grew 43 → 122 across 12 files. | None | No |

## Confirmed issues & fixes

1. **Open redirect in `src/app/auth/callback/route.ts`** (verified: medium).
   The `next` query param was concatenated into the redirect URL unvalidated.
   **Fix:** route it through `safeInternalPath(next, "/onboarding")` (same guard
   the login form uses). Rejects external/protocol-relative targets.

2. **Read-only line totals could mismatch persisted totals**
   (`src/components/quotes/QuoteWorkspace.tsx`, `ReadOnlyLineItems`) (verified: high).
   The locked/print-adjacent view multiplied an unrounded `unit_price`, while the
   editor and the server `round2` it first. **Fix:** wrap the unit price in
   `round2` in the read-only row, restoring exact parity with the persisted value.

3. **`saveQuoteDraft` did not enforce draft-only editing server-side**
   (`src/lib/actions/quotes.ts`) (verified: high).
   Only the client UI gated editing; a direct call could replace line items on a
   sent/accepted quote. **Fix:** after the org-ownership check, reject when
   `!isQuoteEditable(existing.status)` — "Reopen the quote to draft first."

## Acceptance status

Product, Security, Engineering, and Scope acceptance criteria are met:
end-to-end quote workflow works; lifecycle is explicit and server-validated;
proposal/PDF is professional; demo mode + script exist; AI is guarded and
fallback-safe; org data is protected (RLS + app checks); no open redirects or
known IDOR; no secrets committed; calculations/AI-schema/status transitions are
tested; typecheck, tests, and build pass; docs updated.

**Verdict: ready for validation with 5–10 contractors.** No blocking issues remain.
