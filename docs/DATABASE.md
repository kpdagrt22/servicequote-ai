# Database — ServiceQuote AI

Postgres on Supabase. Migrations live in `supabase/migrations` and run in order:

1. `0001_init.sql` — extensions, tables, triggers, helper functions
2. `0002_rls.sql` — Row Level Security
3. `0003_storage.sql` — storage buckets + policies

Row types are mirrored by hand in `src/lib/types/db.ts` (kept in sync so the app
type-checks without a live DB connection).

## Tables

| Table | Purpose | Key columns |
| --- | --- | --- |
| `profiles` | 1:1 with `auth.users` | `id` (FK auth.users), `full_name`, `email` |
| `organizations` | A contractor business | `owner_id`, `name`, `trade`, pricing defaults, branding, `onboarding_completed` |
| `organization_members` | Membership + role | `organization_id`, `user_id`, `role` (owner/admin/member) |
| `customers` | People you quote | `organization_id`, `name`, contact + address |
| `price_book_items` | The accuracy layer | `organization_id`, `name`, `material_cost`, `labor_minutes`, `markup_percent`, `price_override`, `active`, `source` |
| `quote_requests` | A job-notes submission | `raw_input`, `job_location`, `ai_status`, `ai_confidence` |
| `quotes` | A quote/estimate | `quote_number`, `title`, `scope_summary`, `assumptions`, `exclusions`, `status`, `subtotal`, `tax_percent`, `tax_amount`, `total`, `currency`, `valid_until`, `pdf_url` |
| `quote_line_items` | Lines within a quote | `quote_id`, `quantity`, `material_cost`, `labor_minutes`, `labor_rate`, `markup_percent`, `unit_price`, `total_price`, `ai_generated`, `confidence` |
| `quote_counters` | Per-org sequential numbers | `organization_id`, `last_number` (locked down) |
| `ai_extraction_logs` | Auditing AI calls | `provider`, `model`, `input_text`, `output_json`, `status`, `error_message` |
| `quote_events` | Activity timeline | `quote_id`, `event_type`, `metadata` |
| `subscriptions` | Stripe billing state | `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status`, `current_period_end` |

> The schema adds a few fields beyond the original outline where the app needs
> them: `organizations.onboarding_completed` and `google_review_url`,
> `quotes.tax_percent` and `currency`. These keep totals reproducible and
> branding complete.

## Triggers & functions

- `set_updated_at()` — `BEFORE UPDATE` trigger maintaining `updated_at` on all
  mutable tables.
- `handle_new_user()` — `AFTER INSERT` on `auth.users`; auto-creates a `profiles`
  row (so RLS on profiles works immediately).
- `handle_new_organization()` — `AFTER INSERT` on `organizations`; enrolls the
  creator as an `owner` in `organization_members`.
- `is_org_member(org uuid) → bool` and `is_org_editor(org uuid) → bool` —
  `SECURITY DEFINER` helpers used by RLS policies (bypass RLS to avoid recursion
  on `organization_members`).
- `next_quote_number(org uuid) → text` — `SECURITY DEFINER`; atomically
  increments `quote_counters` and returns `Q-0001`-style numbers.

## Row Level Security

RLS is enabled on **every** table. The model:

| Operation | Rule |
| --- | --- |
| **Read** business data | `is_org_member(organization_id)` |
| **Write** business data (customers, price book, quotes, requests, events, logs) | `is_org_editor(organization_id)` (owner/admin) |
| `organizations` insert | `owner_id = auth.uid()` |
| `organizations` update | `is_org_editor(id)`; delete: `owner_id = auth.uid()` |
| `quote_line_items` | scoped via the parent quote's org (subquery) |
| `subscriptions` | members read; writes are **service-role only** (webhook) |
| `quote_counters` | no policies → no direct API access (function-only) |
| `profiles` | users read/update **their own** row |

There is **no cross-organization access path**. A member of org A cannot read or
write any row belonging to org B. Server Actions additionally re-check the editor
role before mutating (defense in depth).

### RLS assumptions (documented for tests)

- `auth.uid()` is the authenticated user; anon/service contexts differ.
- The `handle_new_organization` trigger runs as definer, so the very first
  membership row is created even though the user isn't a member yet.
- The service-role client (`admin.ts`) **bypasses** all of the above and must
  only be used server-side.

## Storage

`0003_storage.sql` creates:

- `logos` — **public-read**, authenticated write (business logos on proposals).
- `proposals` — private; authenticated read/write (generated PDFs, served via
  signed URLs once server-side PDF rendering is added).

> MVP storage policies are permissive (any authenticated user). See
> "Storage hardening" in `ARCHITECTURE.md` before multi-tenant scale.

## Entity relationships

```
auth.users 1─1 profiles
profiles 1─* organizations (owner)
organizations 1─* organization_members *─1 profiles
organizations 1─* customers
organizations 1─* price_book_items
organizations 1─* quote_requests 1─* quotes
quotes 1─* quote_line_items *─0..1 price_book_items
quotes 1─* quote_events
organizations 1─1 subscriptions
```

---

## Alpha hardening update (2026-06)

- **Migration `0004_quote_status_lifecycle.sql`** widens the `quotes.status` CHECK
  constraint to `('draft','ready','sent','accepted','rejected','archived')`. Run it
  after `0001`–`0003`. It drops `quotes_status_check` (if present) and re-adds it
  named. Idempotent / safe to re-run.
- **Status transition rules** are enforced in the application
  (`src/lib/quotes/status.ts` + `updateQuoteStatus`), not the database — the CHECK
  constraint only bounds the legal value set. Allowed: `draft→ready→sent→accepted|rejected`,
  any active → `archived`, and reopen/restore → `draft`. Forbidden: `accepted→draft`,
  `rejected→accepted`, `archived→accepted`.
- **`quote_events.event_type`** is free text (no CHECK); the app now also writes
  `proposal_generated`, `pdf_downloaded`, and `quote_duplicated` in addition to the
  original types. RLS unchanged: members read, editors insert.
- **Ownership** is enforced by RLS plus app-level helpers in
  `src/lib/auth/organizations.ts` (defense in depth). No new tables were added.
