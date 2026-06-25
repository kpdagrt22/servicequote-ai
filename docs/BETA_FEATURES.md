# Beta features (alpha → beta completion)

This release closes the alpha gaps identified in the product-ownership review.
Everything degrades gracefully with an empty `.env` (the unconfigured paths show
notices); the env requirements below unlock each feature.

## Migrations

Run in order: `0001` → `0002` → `0003` → `0004` → **`0005`** → **`0006`**.

- `0005_quote_sharing.sql` — adds `quotes.share_token` + sharing/response columns.
- `0006_org_invitations.sql` — adds `organization_invitations` (+ RLS).

All migrations are idempotent and additive (safe to re-run).

## 1. Customer proposal delivery & acceptance (T2 / T7)

- A contractor clicks **Send to customer** on a quote that is *ready* or later.
  This mints an unguessable `share_token`, promotes `ready → sent`, and (if a
  customer email is on file and Resend is configured) emails a link.
- Customers open `/p/<token>` — a public, read-only branded proposal — and
  **Accept** or **Decline** it. That transition (`sent → accepted|rejected`) runs
  through the same status guard as the app and is recorded as a quote event.
- **Security:** the public page and the respond API use the **service-role**
  client server-side and only ever read/update the single quote matching the
  token. RLS is never opened to anonymous users. Pages are `noindex`.
- **Requires:** `SUPABASE_SERVICE_ROLE_KEY` (for the public read + customer
  response). Email is optional — without Resend the contractor copies the link.

## 2. Billing entitlements (T4 / T5)

- The Stripe checkout now stamps the plan into session + subscription metadata,
  and the webhook records `plan` + `current_period_end` on the subscription row.
- Free organizations (no active paid plan) are capped at `FREE_QUOTE_LIMIT`
  quotes; any active plan (`active`/`trialing`/`past_due`) lifts the cap. Enforced
  server-side in `generateDraftQuote` and `duplicateQuote`.
- Settings shows the current plan with an upgrade/manage link.

## 3. AI usage quota (T3)

- Per-org daily AI-generation cap (`AI_DAILY_QUOTA`, higher for paid orgs),
  counted from `ai_extraction_logs`. Protects real-provider cost from abuse.

## 4. Team invitations (T8)

- Owners/admins invite teammates by email (Settings → Team). Invites carry a
  token and expire after `INVITATION_EXPIRY_DAYS`. The invitee accepts at
  `/invite/<token>` while signed in with the matching email; acceptance enrolls
  them in `organization_members` via the service-role path (verified token +
  email). Inviting/revoking is RLS-enforced (editors only).
- **Requires:** `SUPABASE_SERVICE_ROLE_KEY` (member list + accept). Email
  optional (otherwise share the invite link manually).

## 5. Email (T6)

- `RESEND_API_KEY` + `RESEND_FROM_EMAIL` enable proposal + invite emails. All
  email bodies HTML-escape caller values. Sending degrades to `skipped` when
  unconfigured — it never throws.

## 6. Observability (T10)

- `captureError()` forwards sanitized errors to `ERROR_WEBHOOK_URL` (Sentry
  tunnel / Slack / any JSON sink) when set — server-only, best-effort.
- CI actions bumped to `actions/checkout@v5` / `setup-node@v5`.

## New / changed environment variables

| Var | Required for | Notes |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | public proposals, customer responses, team mgmt, Stripe webhook | server-only |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | proposal + invite emails | optional |
| `ERROR_WEBHOOK_URL` | error forwarding | optional, server-only |
| `STRIPE_PRICE_STARTER/PRO/TEAM/SETUP` | plan↔price mapping in the webhook | server-only |
