# Environment Variable Matrix — ServiceQuote AI

Source of truth: `src/lib/config.ts`, `src/lib/env.ts`, `.env.example`. Verify any
environment with `npm run verify:env`.

> **Two naming notes (reality vs. some older docs/specs):**
> - Email "from" address is **`RESEND_FROM_EMAIL`** (not `FROM_EMAIL`).
> - Stripe price IDs are **server-only `STRIPE_PRICE_STARTER/PRO/TEAM/SETUP`**
>   (not `NEXT_PUBLIC_STRIPE_PRICE_*`). They never need to be public.

## Matrix

| Variable | Req. local? | Req. prod? | Public/Server | Used by | Example placeholder | If missing | Where in Vercel | Security |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | For auth | **Yes** | Public | Supabase clients, middleware, `org.ts` | `https://abc.supabase.co` | App runs in setup/mock mode; auth disabled, "Supabase isn't configured" notice | Env vars (all envs) | Public by design |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For auth | **Yes** | Public | Supabase clients | `eyJ...` (anon) | Same as above | Env vars (all envs) | Public; RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Recommended | **Server-only** | `supabase/admin.ts` (webhook, `/admin`) | `eyJ...` (service_role) | `/admin` shows "service role required"; webhook can't write subscriptions | Env vars (secret) | **Bypasses RLS — never expose. Do not prefix NEXT_PUBLIC.** |
| `AI_PROVIDER` | Optional | Optional | Server | `config.ts → effectiveProvider` | `mock` | Defaults to `mock` | Env vars | — |
| `OPENAI_API_KEY` | Optional | Optional | **Server-only** | `ai/providers/openai.ts` | `sk-...` | If `AI_PROVIDER=openai`, falls back to mock | Env vars (secret) | Secret; never public |
| `ANTHROPIC_API_KEY` | Optional | Optional | **Server-only** | `ai/providers/anthropic.ts` | `sk-ant-...` | If `AI_PROVIDER=anthropic`, falls back to mock | Env vars (secret) | Secret; never public |
| `AI_OPENAI_MODEL` | Optional | Optional | Server | `config.ts` | `gpt-4o-mini` | Uses built-in default | Env vars | — |
| `AI_ANTHROPIC_MODEL` | Optional | Optional | Server | `config.ts` | `claude-haiku-4-5-20251001` | Uses built-in default | Env vars | — |
| `RESEND_API_KEY` | Optional | Optional | **Server-only** | `config.ts → resendConfig` | `re_...` | Email not sent; no crash | Env vars (secret) | Secret |
| `RESEND_FROM_EMAIL` *(spec's `FROM_EMAIL`)* | Optional | Optional | Server | `config.ts → resendConfig` | `ServiceQuote AI <hello@example.com>` | Uses built-in default sender | Env vars | — |
| `STRIPE_SECRET_KEY` | Optional | Optional | **Server-only** | `billing/stripe.ts`, checkout route | `sk_test_...` | "Billing not configured"; checkout 503 | Env vars (secret) | Secret |
| `STRIPE_WEBHOOK_SECRET` | Optional | Optional | **Server-only** | webhook route | `whsec_...` | Webhook acknowledges but does not verify/write | Env vars (secret) | Secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Optional | Public | `config.ts` | `pk_test_...` | Stripe.js disabled | Env vars | Public by design |
| `STRIPE_PRICE_STARTER` *(server-only)* | Optional | Optional | **Server-only** | `billing/stripe.ts` | `price_...` | Checkout for that plan errors "no price configured" | Env vars | — |
| `STRIPE_PRICE_PRO` *(server-only)* | Optional | Optional | **Server-only** | `billing/stripe.ts` | `price_...` | As above | Env vars | — |
| `STRIPE_PRICE_TEAM` *(server-only)* | Optional | Optional | **Server-only** | `billing/stripe.ts` | `price_...` | As above | Env vars | — |
| `STRIPE_PRICE_SETUP` *(server-only)* | Optional | Optional | **Server-only** | `billing/stripe.ts` | `price_...` | Setup checkout errors | Env vars | — |
| `NEXT_PUBLIC_APP_URL` | Optional | **Yes (prod)** | Public | `config.ts → appUrl`, Stripe URLs, auth redirect | `https://app.servicequote.ai` | Defaults to `http://localhost:3000` (wrong absolute URLs in prod) | Env vars (Production) | Public |
| `ADMIN_EMAILS` | Optional | Optional | Server | `config.ts → adminConfig`, `/admin` | `you@example.com,ops@example.com` | `/admin` shows "admin not enabled" | Env vars | Limits internal page |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` | Optional | Optional | Public | reserved (observability) | `phc_...` | Analytics off | Env vars | Public by design |
| `SENTRY_DSN` | Optional | Optional | Server | reserved (observability) | `https://...sentry.io/...` | Error reporting off | Env vars | — |

## Profiles

### Profile A — Local Mock (fastest dev)
- `AI_PROVIDER=mock` (or unset).
- Supabase: **optional** — app runs without it (setup/mock mode), but auth +
  persistence need the two `NEXT_PUBLIC_SUPABASE_*` keys.
- No Stripe, no Resend, no real AI keys.
- `npm run verify:env` will warn that required keys are missing — expected.

### Profile B — Production Alpha Minimum (recommended for first contractors)
- **Required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.
- `AI_PROVIDER=mock` (no AI keys needed).
- Stripe: optional (pricing page shows "Billing not configured" without it).
- Resend: optional.

### Profile C — Production Integrated Test (validating paid + real AI)
- Everything in Profile B, plus:
- `AI_PROVIDER=openai` (+ `OPENAI_API_KEY`) **or** `anthropic` (+ `ANTHROPIC_API_KEY`).
- Stripe **test mode**: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_*` price IDs; webhook → `<APP_URL>/api/stripe/webhook`.
- `RESEND_API_KEY` (+ `RESEND_FROM_EMAIL`) for transactional email.
- `ADMIN_EMAILS` set for the `/admin` debug view.
