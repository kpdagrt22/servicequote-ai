# Vercel Deployment Runbook — ServiceQuote AI

Deploy the Next.js app to Vercel. Pairs with
`docs/SUPABASE_PRODUCTION_RUNBOOK.md` and `docs/ENVIRONMENT_MATRIX.md`.

---

## Deploy steps

- [ ] **1. Import the GitHub repo** — Vercel → Add New → Project → import `kpdagrt22/servicequote-ai`.
- [ ] **2. Select the project / scope** — choose your team/personal scope.
- [ ] **3. Framework preset: Next.js** — auto-detected.
- [ ] **4. Install command** — default `npm install` (lockfile present).
- [ ] **5. Build command** — default `next build` (`npm run build`).
- [ ] **6. Output settings** — default (`.next`); no `Output Directory` override; Node 20.x.
- [ ] **7. Required env vars** (Project → Settings → Environment Variables):
  ```
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY        # secret, NOT public
  NEXT_PUBLIC_APP_URL              # set after first deploy (step 11)
  ```
- [ ] **8. Optional env vars** (see `docs/ENVIRONMENT_MATRIX.md`):
  ```
  AI_PROVIDER=mock                 # default; openai|anthropic to enable real AI
  OPENAI_API_KEY / ANTHROPIC_API_KEY
  RESEND_API_KEY / RESEND_FROM_EMAIL
  STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  STRIPE_PRICE_STARTER / STRIPE_PRICE_PRO / STRIPE_PRICE_TEAM / STRIPE_PRICE_SETUP
  ADMIN_EMAILS
  ```
- [ ] **9. Preview deployments** — every PR/branch gets a preview URL automatically; use it to smoke test before promoting.
- [ ] **10. Production deployment** — pushing/merging to `main` deploys production (after CI is green).
- [ ] **11. Set `NEXT_PUBLIC_APP_URL`** — after the first deploy, set it to the real domain (e.g. `https://app.servicequote.ai`) and redeploy. Used for Stripe success/cancel URLs and the auth email redirect.
- [ ] **12. Update Supabase callback URL** — once the Vercel URL is known, add `<APP_URL>/auth/callback` to Supabase → Auth → Redirect URLs, and set Site URL.
- [ ] **13. Stripe test env (placeholder)** — optional: add `STRIPE_SECRET_KEY` (test mode) + price IDs + webhook secret; point a Stripe webhook at `<APP_URL>/api/stripe/webhook`. Without these the pricing page shows "Billing not configured" — safe.
- [ ] **14. AI provider = mock (default)** — leave `AI_PROVIDER=mock` for alpha; no AI keys needed.
- [ ] **15. Real OpenAI/Anthropic (placeholder)** — to enable, set `AI_PROVIDER=openai|anthropic` and the matching key; the app falls back to mock if the key is missing or the call errors.
- [ ] **16. Health / smoke route** — there is **no dedicated `/health` route**; use the public routes below as smoke checks (`/` and `/pricing` are static and a good liveness signal).
- [ ] **17. Smoke test checklist** — run `docs/PRODUCTION_SMOKE_TEST.md` against the deployed URL.
- [ ] **18. Rollback** — Vercel → Deployments → pick the last good deployment → **Promote to Production**. Immutable deployments; instant rollback. (DB migrations are separate and forward-only.)

## Exact smoke-test URLs

Replace `<APP_URL>` with your deployment URL.

| URL | Expect |
| --- | --- |
| `<APP_URL>/` | Landing page (static, 200) |
| `<APP_URL>/pricing` | Pricing page (Starter/Pro/Team + setup) |
| `<APP_URL>/login` | Login form (or "Supabase isn't configured" notice if keys missing) |
| `<APP_URL>/signup` | Signup form |
| `<APP_URL>/dashboard` | Redirects to `/login` when unauthenticated; dashboard when authed |
| `<APP_URL>/quotes/new` | New-quote wizard (authed) |
| `<APP_URL>/quotes` | Quote list (authed) |
| `<APP_URL>/quotes/<id>` | Quote detail / workspace (authed) |
| `<APP_URL>/price-book` | Price book (authed) |
| `<APP_URL>/customers` | Customers (authed) |
| `<APP_URL>/proposal/<id>/print` | Branded proposal (authed) |
| `<APP_URL>/admin` | Admin debug — only for `ADMIN_EMAILS`, else "not authorized" |

## Common errors

| Symptom | Cause / fix |
| --- | --- |
| **Build error: type error** | Run `npm run typecheck` locally; the build also type-checks. Fix and re-push. |
| **Build error: ESLint** | ESLint isn't configured; `next build` skips lint (no failure). |
| **App loads but login says "Supabase isn't configured"** | `NEXT_PUBLIC_SUPABASE_*` missing in Vercel — add + redeploy. |
| **`auth_callback_failed` after email link** | `<APP_URL>/auth/callback` not in Supabase redirect URLs, or `NEXT_PUBLIC_APP_URL` wrong. |
| **`new row violates row-level security policy`** | Migrations/RLS not applied — see Supabase runbook. |
| **AI draft is always the same generic items** | `AI_PROVIDER=mock` (expected for alpha) — set a real provider + key to change. |
| **Real AI errors / falls back to mock** | Bad/missing key or provider error; check the key and the `ai_extraction_logs` rows in `/admin`. |
| **Proposal "Save as PDF" missing margins/styling** | Browser print dialog — enable "Background graphics", set margins to Default; this is the documented print-to-PDF approach. |
| **Pricing CTA does nothing / "Billing not configured"** | Stripe env not set — expected; configure Stripe to enable checkout. |
