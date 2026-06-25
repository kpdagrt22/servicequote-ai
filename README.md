# ServiceQuote AI

**Create professional service quotes in minutes, not hours.**

ServiceQuote AI turns a contractor's plain-English job notes into an editable,
line-item estimate and a branded PDF proposal. It is built for US service
contractors — starting with **electrical and HVAC** — and is deliberately lean:
no scheduling, no full CRM, no accounting integrations. Just faster quotes.

> The contractor stays in control. Every AI draft is editable, and the app never
> claims guaranteed pricing — your price book is the accuracy layer.

---

## Highlights

- **Job notes → draft quote** using a pluggable AI provider (mock / OpenAI /
  Anthropic). Works out of the box with a deterministic **mock** — no API keys.
- **Editable line items** with live totals (materials + labor + markup + tax).
- **Your price book** is the source of truth; the AI matches against it.
- **Branded proposal PDF** via a print-optimized page (browser “Save as PDF”).
- **Organization-scoped data** protected by Postgres Row Level Security.
- **Runs with an empty `.env`** — every external integration degrades to a mock
  or an on-screen setup notice.

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth,
Storage, RLS) · Zod · React Hook Form · Vitest · Playwright · Stripe (optional).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full picture.

---

## Local setup

### Prerequisites

- Node.js 18.18+ (tested on Node 20+)
- npm

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

You can run the app **immediately with an empty file** — auth-gated pages will
show a setup notice, and AI uses the mock provider. To enable accounts and
persistence, fill in the Supabase keys (below).

### 3. Run

```bash
npm run dev
# http://localhost:3000
```

---

## Environment variables

All optional except the two `NEXT_PUBLIC_SUPABASE_*` keys (needed for accounts).

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | for auth | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | for auth | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | for admin/webhooks | Service-role key (server only — bypasses RLS) |
| `AI_PROVIDER` | no | `mock` (default), `openai`, or `anthropic` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | no | Only if using a real AI provider |
| `RESEND_API_KEY` | no | Transactional email (mockable) |
| `STRIPE_SECRET_KEY` | no | Billing; absent → “Billing not configured” |
| `STRIPE_WEBHOOK_SECRET` | no | Verify Stripe webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | no | Stripe.js publishable key |
| `STRIPE_PRICE_STARTER/PRO/TEAM/SETUP` | no | Stripe Price IDs per plan |
| `ADMIN_EMAILS` | no | Comma-separated allowlist for `/admin` |
| `NEXT_PUBLIC_APP_URL` | no | Base URL (default `http://localhost:3000`) |

> If `AI_PROVIDER` is set to a real provider but its key is missing, the app
> automatically falls back to the mock so the flow never breaks.

---

## Supabase migrations

The SQL lives in [`supabase/migrations`](supabase/migrations). Run the files
**in order** against your project.

**Option A — Supabase SQL editor (quickest):** paste and run each file in order:

1. `0001_init.sql` — tables, triggers, helper functions
2. `0002_rls.sql` — Row Level Security policies
3. `0003_storage.sql` — `logos` + `proposals` storage buckets

**Option B — psql / Supabase CLI:**

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_rls.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0003_storage.sql
```

`npm run db:migrate` prints a reminder of these steps.

See [`docs/DATABASE.md`](docs/DATABASE.md) for the schema and RLS model.

---

## Seeding demo data

Two ways to get example electrical/HVAC price book items:

- **In-app (recommended):** on the **Price book** page, click **“Load example
  items.”** Inserts the trade-appropriate starter items
  (`src/lib/price-book/examples.ts`).
- **SQL:** after creating an account + organization, run
  [`supabase/seed/demo.sql`](supabase/seed/demo.sql). It seeds any organization
  that has no price book items. `npm run db:seed` prints the reminder.

---

## Running tests

```bash
npm run test        # Vitest unit tests (calculations, AI schema, matching, build)
npm run test:watch  # watch mode
npm run typecheck   # tsc --noEmit
npm run test:e2e    # Playwright (see tests/e2e/README.md)
```

Unit tests cover the money math, tax/markup, Zod validation of AI output, the
price-book matcher, and quote line-item construction — the logic that must be
correct. They require **no** external services.

---

## How to deploy

The app targets **Vercel** + **Supabase**. Short version:

1. Create a Supabase project; run the migrations.
2. Deploy to Vercel; set the env vars from the table above.
3. (Optional) Configure Stripe products/prices + the webhook endpoint.

Full guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Project structure

```
src/
  app/
    (marketing)/        Landing, pricing, legal
    (auth)/             Login, signup
    (app)/              Authenticated shell: dashboard, quotes, price-book, customers, settings
    onboarding/         First-run business setup
    proposal/[id]/print Branded, print-ready proposal (→ PDF)
    admin/              Internal cross-org debug view (service-role gated)
    api/stripe/         Checkout + webhook routes
    auth/callback/      Email-confirm / OAuth exchange
  components/           UI + feature components
  lib/
    ai/                 Provider abstraction (mock/openai/anthropic) + Zod schema
    quotes/             Pure pricing math + draft-building
    price-book/         Matching + example data
    actions/            Server actions (mutations)
    supabase/           Server / browser / admin clients
    validation/         Zod form schemas
supabase/migrations/    SQL schema, RLS, storage
tests/unit/             Vitest
tests/e2e/              Playwright
docs/                   PRD, architecture, database, AI workflow, validation, deployment
```

---

## Product guardrails (by design)

- AI output is a **draft**; the contractor edits every line and price.
- No auto-send — quotes are only shared when the user chooses.
- No guaranteed-pricing claims anywhere in the UI or proposals.
- No scheduling, full CRM, native mobile app, multi-trade complexity, or
  QuickBooks/Xero integration in v1.

See [`docs/PRD.md`](docs/PRD.md) and [`docs/VALIDATION_PLAN.md`](docs/VALIDATION_PLAN.md).
