# Release PR Review — Alpha Hardening

Date: 2026-06-26
Reviewer: release engineering (pre-merge gate)

## PR

| Field | Value |
| --- | --- |
| PR | [#1](https://github.com/kpdagrt22/servicequote-ai/pull/1) |
| Title | Alpha hardening: quote lifecycle, proposal quality, AI guardrails, security & validation demo |
| Base branch | `main` (`9a4bbe0`) |
| Head branch | `alpha-hardening-quote-lifecycle` |
| State | OPEN |
| Mergeable | `MERGEABLE` (no conflicts) |
| Review decision | none required (solo repo) |
| Diff | **46 files, +2513 / −218** (19 added, 27 modified) |

### Commits

- `9a4bbe0` — feat: initial ServiceQuote AI MVP (base)
- `ebe9c32` — Alpha hardening for quote lifecycle and validation readiness
- `<release commit>` — Fix CI e2e locator + add release runbooks & beta kit (this review)

### Files changed (summary)

- **Migrations:** `supabase/migrations/0004_quote_status_lifecycle.sql` (new) — widens `quotes.status` CHECK.
- **Domain libs (new):** `quotes/status.ts`, `quotes/proposal.ts`, `auth/organizations.ts`, `env.ts`, `observability/events.ts`, `actions/demo.ts`.
- **Modified libs:** `actions/quotes.ts`, `actions/price-book.ts`, `actions/onboarding.ts`, `ai/{prompt,schemas,providers/mock}`, `constants.ts`, `validation/price-book.ts`, `price-book/examples.ts`, `quotes/calculations.ts`.
- **UI:** `QuoteWorkspace.tsx`, `proposal/[id]/print/page.tsx`, `app/ui.tsx`, `PriceBookManager.tsx`, `QuoteTimeline.tsx`, `dashboard/page.tsx`, `quotes/[id]/page.tsx`, `auth/callback/route.ts`, `DemoDataButton.tsx` (new).
- **Tests:** 7 new unit specs (43 → 122 tests); 1 e2e fix.
- **Docs:** 4 new (`AUDIT_ALPHA_HARDENING`, `FINAL_ALPHA_AUDIT`, `DEMO_SCRIPT`, `SUPABASE_SETUP`) + README & 6 docs updated; release docs added in this review.
- **Scripts:** `scripts/verify-env.mjs`.

## CI status

Workflow: `.github/workflows/ci.yml` (jobs: `verify`, `e2e`).

| Run (commit `ebe9c32`) | Result |
| --- | --- |
| `verify` (typecheck + unit tests + build) | ✅ SUCCESS |
| `e2e` (Playwright public happy path) | ❌ FAILURE → **fixed in this review** |

**e2e failure root cause (not a product bug):** `tests/e2e/happy-path.spec.ts` used
`getByRole("heading", { name: "Pro" })`, which substring-matched the marketing
footer's **"Product"** heading → Playwright strict-mode violation (2 elements).
**Fix:** use `{ exact: true }` for the `Starter` / `Pro` / `Team` plan headings.
This *strengthens* the assertion (no test was weakened). Re-verified locally: full
e2e suite **5 passed, 1 skipped** (the authenticated flow is skipped without a test
Supabase project — by design).

**CI re-ran green on commit `7cc6367`:** `verify` ✅ SUCCESS and `e2e` ✅ SUCCESS.
PR is `MERGEABLE` / `mergeStateStatus: CLEAN`. Safe to merge (human action).

## Diff Review Findings

| # | Area | Verdict | Files reviewed | Notes |
| --- | --- | --- | --- | --- |
| 1 | Database migrations | PASS | `0001`–`0004` | `0004` drops+re-adds `quotes_status_check` to the 6-status set; idempotent; correct order. No destructive ops. |
| 2 | RLS / security | PASS | `0002_rls.sql`, `auth/organizations.ts` | Members read / editors write; helper fns SECURITY DEFINER; no cross-org path; service role server-only. |
| 3 | Quote status lifecycle | PASS | `quotes/status.ts`, `actions/quotes.ts` | Forbidden transitions blocked; DB CHECK == `QUOTE_STATUSES`. |
| 4 | Quote editing restrictions | PASS | `actions/quotes.ts` | `saveQuoteDraft` now enforces draft-only **server-side** (`isQuoteEditable`). |
| 5 | Duplicate quote ownership | PASS | `actions/quotes.ts` | Source loaded org-scoped; copy stays in same org; new number; status draft. |
| 6 | Customer ownership | PASS | `actions/quotes.ts`, `auth/organizations.ts` | `assertCustomerBelongsToOrg` before linking a customer to a quote. |
| 7 | Price book validation | PASS | `validation/price-book.ts` | Name required, unit defaulted, negatives rejected, categories. |
| 8 | Proposal mapper | PASS | `quotes/proposal.ts`, `proposal/[id]/print/page.tsx` | Pure mapper; unit-tested; unit column + job location + signature block + disclaimer. |
| 9 | PDF / print behavior | PASS (documented limitation) | `proposal/[id]/print/page.tsx`, `PrintToolbar.tsx` | Browser print-to-PDF; server-rendered PDF is a documented future upgrade. |
| 10 | AI schema / guardrails | PASS | `ai/schemas`, `ai/prompt.ts`, `ai/providers/mock.ts`, `ai/service.ts` | Zod-validated; mock fallback; `cannot_price_items`/`missing_information`; safety rules. |
| 11 | Env validation | PASS | `env.ts`, `scripts/verify-env.mjs` | Required vs optional; safe warnings; never crashes build. |
| 12 | Demo seed | PASS | `actions/demo.ts`, `DemoDataButton.tsx` | Auth-gated (editor, current org only); seeds customer + price book + draft quote. |
| 13 | Admin / internal routes | PASS | `app/admin/page.tsx` | Gated by `ADMIN_EMAILS` + service role; not in this diff but unaffected. |
| 14 | Docs | PASS | `docs/*`, `README.md` | Updated for alpha; release docs added. |
| 15 | Tests | PASS | `tests/unit/*`, `tests/e2e/*` | 122 unit + 5 e2e passing after the locator fix. |
| 16 | CI | PASS | `.github/workflows/ci.yml` | e2e was red (locator); fixed; CI green on `7cc6367` (`verify` + `e2e` both SUCCESS). |

**Blockers found:** 1 — CI e2e locator (fixed in this branch, not force-pushed).
**No product/security blockers.**

## Local verification (this review)

| Command | Result |
| --- | --- |
| `node scripts/verify-env.mjs` (`npm run verify:env`) | Works; exits 1 with no Supabase keys and reports mock/setup mode (by design). |
| `npx vitest run` (`npm run test`) | **122 passed** (12 files). |
| `npx tsc --noEmit` (`npm run typecheck`) | **Clean.** |
| `npx playwright test` (`npm run test:e2e`) | **5 passed, 1 skipped** (after the locator fix). |
| `npx next build` (`npm run build`) | **Success, 20/20 pages.** |
| `npm run lint` | ESLint **not configured** (documented limitation; `tsc` + build are the static gate). |

No secrets in any command output.

## Risk summary

- **Low** overall. All security/correctness categories pass; the only CI red was a
  test-locator bug (fixed). Known limitations (browser print-to-PDF, permissive
  storage policies, untested real AI providers, generic demo notes for unsupported
  trades, no ESLint) are documented and **non-blocking for alpha validation**.

## Safe to merge?

**SAFE WITH WARNINGS — once CI is green on the release commit.** See
`docs/RELEASE_DECISION_PR.md` for the formal decision and the full warning list.

## Required human action

1. Wait for CI (`verify` + `e2e`) to go green on the release commit.
2. Merge PR #1 into `main` (do not force-merge; squash or merge commit per preference).
3. Provision Supabase + Vercel per the runbooks, deploy, run the smoke test.
4. Begin contractor validation per `docs/BETA_CONTRACTOR_OPERATIONS.md`.
