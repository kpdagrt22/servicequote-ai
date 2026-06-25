# Supabase Setup — ServiceQuote AI

Step-by-step to take the app from "runs in mock mode" to a real, persistent,
multi-tenant deployment. ~15 minutes.

> The app runs with an **empty `.env`** (mock AI, on-screen setup notices). You
> only need Supabase to enable accounts and persistence.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a name, a strong database password, and a region near your users.
3. Wait for provisioning (~2 min).

## 2. Copy your keys

Project → **Settings → API**:

| Supabase value | `.env.local` variable |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key (secret) | `SUPABASE_SERVICE_ROLE_KEY` |

## 3. Add env vars locally

```bash
cp .env.example .env.local
# paste the three values above
npm run verify:env   # confirms what's configured
```

`verify:env` exits 0 when the two required public keys are present and warns
about optional integrations.

## 4. Run migrations (in order)

Open Supabase → **SQL Editor**, then paste & run each file **in order**:

1. `supabase/migrations/0001_init.sql` — tables, triggers, helper functions
2. `supabase/migrations/0002_rls.sql` — Row Level Security policies
3. `supabase/migrations/0003_storage.sql` — `logos` + `proposals` buckets
4. `supabase/migrations/0004_quote_status_lifecycle.sql` — widens quote statuses to `ready`/`archived`

(Or via psql: `psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql`, etc.)

`npm run db:migrate` prints this reminder.

## 5. Verify tables

Supabase → **Table editor**. You should see: `profiles`, `organizations`,
`organization_members`, `customers`, `price_book_items`, `quote_requests`,
`quotes`, `quote_line_items`, `quote_counters`, `ai_extraction_logs`,
`quote_events`, `subscriptions`.

## 6. Verify RLS is enabled

Supabase → **Authentication → Policies** (or Table editor → a table → **RLS
enabled** badge). Every table should show **RLS enabled** with policies. The
model (see `docs/DATABASE.md`):

- **Read** business data → members of the org.
- **Write** business data → owner/admin (editor) of the org.
- No cross-organization access path.

Quick sanity check (SQL editor): this should return `t` for every table.

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r'
order by relname;
```

## 7. Storage buckets

`0003_storage.sql` already creates:

- `logos` — **public read**, authenticated write (logos shown on proposals).
- `proposals` — private (reserved for server-rendered PDFs later).

Confirm under **Storage**. The MVP proposal is produced via the browser print
dialog, so `proposals` may stay empty until you add server-side PDF rendering.

## 8. Auth configuration

Supabase → **Authentication → URL Configuration**:

- **Site URL**: your app URL (e.g. `http://localhost:3000` or your domain).
- **Redirect URLs**: add `<APP_URL>/auth/callback`.

Email confirmation is on by default. With it on, signup shows
"check your email"; the `/auth/callback` route exchanges the code for a session.
For fast local testing you may disable email confirmation under
**Authentication → Providers → Email**.

## 9. Create your first user

Run the app (`npm run dev`), open `/signup`, create an account, and complete
onboarding. The `handle_new_user` trigger auto-creates a `profiles` row; creating
an organization auto-enrolls you as `owner` via `handle_new_organization`.

## 10. Test onboarding

After onboarding you land on `/dashboard`. Add a price book item (or click
**Load example items** on the Price book page).

## 11. Seed demo data

Fastest: on the dashboard click **Seed demo data** (creates a demo customer,
example price book, and a generated draft quote). Or run
`supabase/seed/demo.sql` in the SQL editor. See `docs/DEMO_SCRIPT.md`.

## 12. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Login page shows "Supabase isn't configured" | `NEXT_PUBLIC_SUPABASE_*` missing — set them, restart `npm run dev`. |
| `new row violates row-level security policy` | You're not an editor of that org, or `0002_rls.sql` didn't run. Re-run it. |
| `violates check constraint "quotes_status_check"` | `0004_*.sql` not applied — run it. |
| Signup says "check your email" but no email | Email provider not configured in Supabase, or confirmation on — disable it for local, or check spam. |
| `/admin` says "not authorized" | Add your email to `ADMIN_EMAILS` and set `SUPABASE_SERVICE_ROLE_KEY`. |
| Quote totals look off | They're recomputed server-side on save; reload. Calculations are unit-tested. |

## Optional: generate TypeScript types

Types are **hand-authored** in `src/lib/types/db.ts` so the app type-checks
without a live DB. If you prefer generated types:

```bash
supabase gen types typescript --project-id <id> --schema public > src/lib/types/supabase.ts
```

(`npm run db:types` prints this.)
