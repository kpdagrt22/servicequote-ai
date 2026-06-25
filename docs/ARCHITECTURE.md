# Architecture — ServiceQuote AI

## Overview

A single Next.js 14 (App Router) application backed by Supabase (Postgres + Auth
+ Storage). Server Components and Server Actions do the data work; a small number
of Client Components handle interactive editing. Every external integration is
optional and degrades to a mock or a setup notice, so the app runs with an empty
`.env`.

```
Browser ──> Next.js (App Router)
              │  Server Components (read)         ┌──────────────┐
              │  Server Actions (write) ─────────▶│  Supabase    │
              │  Route Handlers (Stripe, auth)    │  Postgres+RLS│
              │  Middleware (session + gating)    │  Auth        │
              │                                    │  Storage     │
              └─ AI service ─▶ mock | OpenAI | Anthropic (fetch)  │
                                                   └──────────────┘
```

## Layers

### 1. Configuration (`src/lib/config.ts`)
The single source of truth for "is X configured?". Exposes `supabaseConfig`,
`aiConfig` (with `effectiveProvider` fallback logic), `stripeConfig`,
`resendConfig`, `adminConfig`. UI and server code branch on these.

### 2. Supabase clients (`src/lib/supabase/`)
- `server.ts` — request-scoped client (cookies) for Server Components/Actions.
  Returns `null` when unconfigured.
- `client.ts` — memoized browser client for auth forms and uploads.
- `admin.ts` — **service-role** client that bypasses RLS. Server-only; used by
  the Stripe webhook and the internal `/admin` page.

All three return `null` when their keys are missing; callers handle that.

### 3. Auth & session
- **Middleware** (`src/middleware.ts`) refreshes the Supabase session on every
  request and redirects unauthenticated users away from protected route prefixes.
- **`src/lib/org.ts`** provides `requireOrg()` / `requireUser()` /
  `getOrganizationOrNull()` — the gatekeepers used at the top of authenticated
  pages and server actions. `requireOrg()` resolves the user's first org + role
  and redirects to `/login` or `/onboarding` as needed.

### 4. Domain logic (pure, testable)
- `src/lib/quotes/calculations.ts` — all money math (unit cost, markup, line
  totals, quote totals/tax). No I/O; identical on server and client so the
  editor's live totals match the server's persisted totals.
- `src/lib/quotes/build.ts` — turns an AI suggestion + matched price book item +
  org defaults into a concrete line item.
- `src/lib/price-book/matching.ts` — deterministic token-overlap matcher.

### 5. AI service (`src/lib/ai/`)
A provider abstraction (see `AI_WORKFLOW.md`):
- `schemas/quote-extraction.ts` — the Zod contract for input and output.
- `providers/{mock,openai,anthropic}.ts` — interchangeable implementations.
- `prompt.ts` — shared prompt builder encoding the guardrails.
- `service.ts` — `extractQuote()` routes to the effective provider, validates,
  and **falls back to mock** on any error, returning metadata for logging.

### 6. Mutations (`src/lib/actions/`)
Server Actions are the only write path. Each one re-derives auth via
`requireOrg()`/`ensureEditor()` (defense in depth alongside RLS), validates
input with Zod, writes, records `quote_events` where relevant, and calls
`revalidatePath`. Key files: `quotes.ts`, `price-book.ts`, `customers.ts`,
`onboarding.ts`, `settings.ts`, `auth.ts`.

### 7. UI
- Route groups: `(marketing)`, `(auth)`, `(app)`. The `(app)` group has a
  sidebar shell and is `force-dynamic` (per-request auth).
- Interactive editors are Client Components (`PriceBookManager`,
  `QuoteWorkspace`, `NewQuoteWizard`, form components). They keep local state and
  call Server Actions, then `router.refresh()`.
- Tailwind with a white/gray/blue palette and a few component classes in
  `globals.css` (`.btn`, `.card`, `.input`, `.badge`).

## The quote pipeline (end to end)

1. **`/quotes/new`** (`NewQuoteWizard`) collects customer + job notes.
2. **`generateDraftQuote`** server action:
   - resolves/creates the customer,
   - loads the active price book,
   - creates a `quote_requests` row,
   - calls `extractQuote()` (mock/real, Zod-validated, fallback),
   - logs to `ai_extraction_logs`, updates the request status,
   - builds line items (`lineItemFromSuggestion`) and computes totals,
   - allocates a `quote_number` via the `next_quote_number` RPC,
   - inserts the `quotes` + `quote_line_items`,
   - records `created` and `ai_generated` events.
3. **`/quotes/[id]`** (`QuoteWorkspace`) is the editable quote (live totals) +
   status controls + customer message + proposal action + activity timeline.
4. **`saveQuoteDraft`** replaces line items and **recomputes all totals
   server-side**, so the DB is always internally consistent.
5. **`/proposal/[id]/print`** renders the branded proposal; the browser's print
   dialog produces the PDF.

## PDF strategy

The MVP generates PDFs from a **print-optimized HTML page** (`@media print`
styles + `window.print()`). This is zero-dependency, reliable cross-platform, and
keeps a single branded layout. Upgrade paths (documented here for later): render
the same layout server-side with Puppeteer or `@react-pdf/renderer`, upload to
the `proposals` storage bucket, and store a signed `pdf_url`.

## Billing

`src/lib/billing/stripe.ts` wraps the Stripe REST API via `fetch` (no SDK).
`/api/stripe/checkout` creates a Checkout session; `/api/stripe/webhook` verifies
the signature with Node `crypto` and upserts the `subscriptions` row via the
admin client. With no keys, both report "not configured" and the UI says so.

## Security model

- **RLS everywhere** (see `DATABASE.md`): reads require org membership; writes
  require the owner/admin role; line items are scoped through their parent quote.
- Helper functions `is_org_member` / `is_org_editor` are `SECURITY DEFINER` to
  avoid policy recursion on `organization_members`.
- The service-role key is **server-only** and never shipped to the browser.
- Server Actions re-check auth/role independently of RLS.

## Storage hardening (future)

The `0003_storage.sql` policies currently allow any authenticated user to manage
objects in the `logos`/`proposals` buckets. Before scaling to many tenants,
restrict by an org-id path prefix (e.g. `org_id/...`) in the policy `using`
clauses.

## Observability (optional)

PostHog and Sentry env vars are reserved in `.env.example`. AI failures and
fallbacks are already persisted to `ai_extraction_logs` and surfaced in `/admin`.

---

## Alpha hardening additions (2026-06)

New modules layered onto the existing architecture (no structural rewrite):

- **`src/lib/quotes/status.ts`** — single source of truth for the quote status lifecycle: statuses (`draft/ready/sent/accepted/rejected/archived`), the transition map, `canTransitionQuoteStatus`, badge variants, and labels. `constants.ts` re-exports it so existing imports keep working. The server (`updateQuoteStatus`) and UI (`QuoteWorkspace`) both consult it; a DB `CHECK` constraint (migration `0004`) bounds the legal values.
- **`src/lib/auth/organizations.ts`** — centralized org auth + ownership helpers (`requireOrganizationMember/OwnerOrAdmin`, `assertCustomerBelongsToOrg`, `assertQuoteBelongsToOrg`, `assertPriceBookItemBelongsToOrg`). Defense in depth alongside RLS; the org is always derived from the session, never a client-supplied id.
- **`src/lib/quotes/proposal.ts`** — pure proposal data mapper (`buildProposalView`, `buildCustomerMessage`) consumed by the print page; unit-tested for missing fields, long descriptions, and totals.
- **`src/lib/env.ts`** + `scripts/verify-env.mjs` — env validation (required public Supabase keys vs optional integrations) with safe warnings; never crashes the build.
- **`src/lib/observability/events.ts`** — dependency-free product-event + error wrapper (`trackEvent`, `captureError`) with key/secret redaction; the single place to forward to PostHog/Sentry later.
- **`src/lib/actions/demo.ts`** — auth-gated `seedDemoData` (current org only) for demos.
