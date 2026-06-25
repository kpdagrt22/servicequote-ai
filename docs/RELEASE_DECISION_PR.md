# Release Decision — PR #1 (Alpha Hardening)

Date: 2026-06-26
PR: [#1](https://github.com/kpdagrt22/servicequote-ai/pull/1) ·
base `main` ← head `alpha-hardening-quote-lifecycle`

## 1. Is the alpha PR safe to merge?

### ✅ SAFE WITH WARNINGS — merge once CI is green on the release commit.

The change is mergeable (no conflicts), all security/correctness audit categories
pass, and the only CI failure (an e2e test-locator bug) was fixed in this branch
without rewriting history. The warnings below are documented, expected for an
alpha, and **non-blocking** for validation with the first contractors.

## 2. Evidence

| Signal | Result |
| --- | --- |
| Unit tests (`npm run test`) | **122 passed** (12 files; +79 over MVP) |
| Typecheck (`tsc --noEmit`) | **Clean** |
| Build (`next build`) | **Success, 20/20 pages** |
| `verify:env` | Works (exits 1 with no Supabase keys; reports mock/setup mode — by design) |
| E2E (`playwright test`) | **5 passed, 1 skipped** after the locator fix |
| Security/product audit | `docs/FINAL_SERVICEQUOTE_RELEASE_AUDIT.md` — 12/12 categories PASS, 0 blockers |
| Prior adversarial audit | `docs/FINAL_ALPHA_AUDIT.md` — 8/8 pass, 3 issues found & fixed |
| Manual diff review | `docs/RELEASE_PR_REVIEW.md` — 16 areas, no product/security blockers |
| CI status (`ci.yml`) | `verify` ✅; `e2e` was ❌ (locator) → fixed; **awaiting green re-run on the release commit** |
| Mergeability | `MERGEABLE` |
| Secrets | None committed (`.env*` ignored; only `.env.example`) |

## 3. Warnings (known, non-blocking for alpha)

- **PDF is browser print-to-PDF only** — no server-rendered PDF / storage bucket yet.
- **Storage bucket policies are permissive** (authenticated-any), not org-prefix scoped — tighten before storing real proposal files.
- **Real OpenAI/Anthropic output is unverified** — mock is the alpha default; validate output before enabling a real provider for customers.
- **Unsupported trades** (roofing/landscaping/handyman) fall back to electrical sample notes in the demo seed (cosmetic).
- **ESLint is not configured** — `tsc` + `next build` are the static gate.

## 4. Required before production-alpha

- [ ] Merge PR #1 after CI is green.
- [ ] Create a Supabase project (`docs/SUPABASE_PRODUCTION_RUNBOOK.md`).
- [ ] Apply migrations `0001`→`0004`; verify RLS enabled.
- [ ] Configure env vars (`docs/ENVIRONMENT_MATRIX.md`, Profile B).
- [ ] Deploy to Vercel (`docs/VERCEL_DEPLOYMENT_RUNBOOK.md`); set `NEXT_PUBLIC_APP_URL`; add the Supabase callback URL.
- [ ] Run the smoke test (`docs/PRODUCTION_SMOKE_TEST.md`).

## 5. Required before paid customers

- [ ] Review real contractor quotes for pricing realism (build their price book with them).
- [ ] If enabling a real AI provider, review its output quality vs. the mock.
- [ ] Test the proposal PDF on both mobile and desktop print dialogs.
- [ ] Tighten the `proposals` storage bucket policy to an org-id prefix if you start storing proposal files.
- [ ] Collect beta feedback (`docs/BETA_CONTRACTOR_OPERATIONS.md` §13).

## 6. Human action

1. **Wait for CI** (`verify` + `e2e`) to go green on the release commit.
2. **Merge PR #1** into `main` (no force; squash or merge per preference). *Do not auto-merge — this is a human decision.*
3. **Deploy** (Supabase + Vercel runbooks).
4. **Run the smoke test.**
5. **Start contractor validation** — first 5–10 electricians/HVAC per the beta kit.

---

**Decision owner:** founder/CTO. This document recommends merge-after-green; it does
not merge automatically.
