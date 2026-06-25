# Deployment — ServiceQuote AI

Target: **Vercel** (Next.js) + **Supabase** (Postgres/Auth/Storage). Stripe and
Resend are optional.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations **in order** (SQL editor or psql):
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_storage.sql`
3. From **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only secret)
4. **Auth → URL configuration:** add your production URL to the allowed redirect
   list, including `https://YOUR_DOMAIN/auth/callback`.
5. (Optional) **Auth → Providers/Email:** decide whether email confirmation is
   required. With confirmation on, signup shows "check your email"; the
   `/auth/callback` route exchanges the code for a session.

## 2. Vercel

1. Import the repo into Vercel (framework auto-detected as Next.js).
2. Add environment variables (Project → Settings → Environment Variables):

   **Required**
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   NEXT_PUBLIC_APP_URL          # e.g. https://app.servicequote.ai
   ```

   **AI (optional — defaults to mock)**
   ```
   AI_PROVIDER=mock | openai | anthropic
   OPENAI_API_KEY / ANTHROPIC_API_KEY
   AI_OPENAI_MODEL / AI_ANTHROPIC_MODEL   # optional overrides
   ```

   **Admin (optional)**
   ```
   ADMIN_EMAILS=you@example.com
   ```

   **Stripe / Resend (optional)** — see below.
3. Deploy. The build runs `next build`; authenticated routes are server-rendered
   on demand, marketing/auth pages are static.

> `NEXT_PUBLIC_APP_URL` must match your real domain — it's used for Stripe
> success/cancel URLs and the auth email redirect.

## 3. Stripe (optional)

1. Create the products/prices in Stripe:
   - Starter ($39/mo), Pro ($99/mo), Team ($199/mo) — recurring.
   - Done-for-you setup ($199) — one-time.
2. Set env vars:
   ```
   STRIPE_SECRET_KEY
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   STRIPE_PRICE_STARTER
   STRIPE_PRICE_PRO
   STRIPE_PRICE_TEAM
   STRIPE_PRICE_SETUP
   STRIPE_WEBHOOK_SECRET
   ```
3. Add a webhook endpoint in Stripe pointing at:
   ```
   https://YOUR_DOMAIN/api/stripe/webhook
   ```
   Subscribe to at least: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
4. Without these vars the pricing page shows **"Billing not configured"** and the
   checkout route returns 503 — the rest of the app works normally.

## 4. Resend (optional)

Set `RESEND_API_KEY` (and `RESEND_FROM_EMAIL`) to enable transactional email.
Left blank, email is simply not sent — nothing breaks.

## 5. Storage buckets

`0003_storage.sql` creates the `logos` (public) and `proposals` (private)
buckets. Logo upload in onboarding/settings uploads to `logos` and stores the
public URL. (PDF storage in `proposals` is reserved for when server-side PDF
rendering is added — today the proposal is produced via the browser print
dialog.)

## 6. Post-deploy smoke test

1. Visit `/` — landing renders.
2. Sign up, complete onboarding → land on `/dashboard`.
3. Price book → "Load example items."
4. New quote → "Use a sample" → "Generate Draft Quote."
5. Edit a line item; confirm totals update; **Save quote**.
6. "Preview & download PDF" → proposal opens → print/Save as PDF.
7. (If `ADMIN_EMAILS` includes you) visit `/admin`.

## CI (suggested)

```yaml
# .github/workflows/ci.yml (sketch)
- run: npm ci
- run: npm run typecheck
- run: npm run test
- run: npm run build
# E2E (public suite) optionally:
- run: npx playwright install --with-deps
- run: npm run test:e2e
```

## Rollback

Vercel keeps immutable deployments — promote a previous deployment to roll back
the app. Database migrations are forward-only; write a reversing SQL migration if
you need to undo a schema change.

---

## Alpha hardening update (2026-06)

- **Migrations now run `0001`→`0004`.** `0004_quote_status_lifecycle.sql` widens the
  quote status CHECK constraint; apply it or status changes to `ready`/`archived`
  will fail. Full walkthrough: `docs/SUPABASE_SETUP.md`.
- **Verify env before/after deploy:** `npm run verify:env` (exits non-zero only when a
  required public Supabase key is missing; warns on optional integrations).
- **Demo data:** after deploy, sign in and click **Seed demo data** on the dashboard,
  or run `supabase/seed/demo.sql`. See `docs/DEMO_SCRIPT.md`.

### Pre-deploy checklist

- [ ] `npm run typecheck` clean
- [ ] `npm run test` green
- [ ] `npm run build` succeeds
- [ ] `npm run verify:env` (required keys present in the target env)
- [ ] Supabase migrations `0001`–`0004` applied; RLS enabled on every table
- [ ] `NEXT_PUBLIC_APP_URL` matches the real domain; `<APP_URL>/auth/callback` in Supabase redirect URLs
- [ ] `ADMIN_EMAILS` + `SUPABASE_SERVICE_ROLE_KEY` set if you need `/admin`
- [ ] Stripe keys + webhook configured (optional; "Billing not configured" otherwise)
- [ ] No secrets committed (`.env*` gitignored)
