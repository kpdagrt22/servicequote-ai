# Supabase Production Runbook — ServiceQuote AI

Practical, checkbox-driven runbook to stand up the production-alpha database.
~20 minutes. Pairs with `docs/VERCEL_DEPLOYMENT_RUNBOOK.md` and
`docs/ENVIRONMENT_MATRIX.md`.

> The app runs in mock/setup mode with no Supabase. You need Supabase for real
> accounts, persistence, and the demo.

---

## Migration review (pre-flight)

Files in `supabase/migrations/`, applied **in this order**:

| Order | File | What it does | Destructive? |
| --- | --- | --- | --- |
| 1 | `0001_init.sql` | Extensions, all tables, triggers (`set_updated_at`, `handle_new_user`, `handle_new_organization`), helper fns (`is_org_member`, `is_org_editor`, `next_quote_number`) | No (create-if-not-exists) |
| 2 | `0002_rls.sql` | Enables RLS + policies on every table | No |
| 3 | `0003_storage.sql` | Creates `logos` (public) + `proposals` (private) buckets + policies | No |
| 4 | `0004_quote_status_lifecycle.sql` | Drops + re-adds `quotes_status_check` to include `ready`/`archived` | Drops one CHECK constraint only; no data loss |

Tables created: `profiles`, `organizations`, `organization_members`, `customers`,
`price_book_items`, `quote_requests`, `quotes`, `quote_line_items`,
`quote_counters`, `ai_extraction_logs`, `quote_events`, `subscriptions`. All are
referenced by the app; demo seed is compatible; no enum/status mismatch
(`QUOTE_STATUSES` == the `0004` CHECK set).

---

## Runbook

### A. Project + keys
- [ ] **1. Create a Supabase project** — supabase.com → New project; strong DB password; region near your users.
- [ ] **2. Copy Project URL** — Settings → API → Project URL → `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] **3. Copy anon public key** — Settings → API → `anon` `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] **4. Copy service_role key** — Settings → API → `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] **5. Keep service_role SERVER-ONLY** — never prefix it with `NEXT_PUBLIC_`, never expose to the browser. In Vercel set it as a non-public env var.

### B. Wire env
- [ ] **6. Local `.env.local`** — `cp .env.example .env.local`; paste the 3 keys; `npm run verify:env` (should report required present).
- [ ] **7. Vercel env** — add the same 3 keys (see `docs/VERCEL_DEPLOYMENT_RUNBOOK.md`); `SUPABASE_SERVICE_ROLE_KEY` as a secret, not public.

### C. Apply migrations (pick ONE option)
- [ ] **8. Option A — Supabase CLI**
  ```bash
  supabase link --project-ref <project-ref>
  supabase db push           # if using the CLI migration history
  # or apply files directly:
  psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
  psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_rls.sql
  psql "$SUPABASE_DB_URL" -f supabase/migrations/0003_storage.sql
  psql "$SUPABASE_DB_URL" -f supabase/migrations/0004_quote_status_lifecycle.sql
  ```
- [ ] **9. Option B — SQL editor** — open each file, paste, run, **in order 0001 → 0002 → 0003 → 0004**.
- [ ] **10. Exact order matters** — `0002` depends on tables from `0001`; `0004` alters the `quotes` table from `0001`.

### D. Verify
- [ ] **11. Verify tables** — Table editor shows all 12 tables listed above.
- [ ] **12. Verify RLS enabled** — each table shows the **RLS enabled** badge. Sanity SQL:
  ```sql
  select relname, relrowsecurity from pg_class
  where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname;
  -- relrowsecurity should be 't' for every app table
  ```

### E. Auth
- [ ] **13. Create an auth user** — run the app, open `/signup`, create an account (the `handle_new_user` trigger creates the `profiles` row).
- [ ] **14. Auth redirect URLs** — Authentication → URL Configuration → Redirect URLs: add `<APP_URL>/auth/callback`.
- [ ] **15. Site URL** — set to your app URL.
- [ ] **16. Production callback URL** — `https://<your-domain>/auth/callback`.
- [ ] **17. Local callback URL** — `http://localhost:3000/auth/callback`.
- [ ] (Optional) For fast local testing, disable email confirmation under Authentication → Providers → Email.

### F. Storage
- [ ] **18. Storage bucket plan** — `logos` (public read) holds business logos shown on proposals; `proposals` (private) is **reserved** for future server-rendered PDFs. Today proposals are produced via the browser print dialog, so `proposals` may stay empty.
- [ ] **19. Browser print-to-PDF limitation** — there is no server-side PDF generation yet; the contractor uses "Save as PDF" in the print dialog. Tighten `proposals` bucket policies to an org-id path prefix before storing real files (see `docs/DATABASE.md` → Storage hardening).

### G. First data + smoke
- [ ] **20. Seed demo data** — dashboard → **Seed demo data** (creates a demo customer, example price book, and a generated draft quote), or run `supabase/seed/demo.sql`.
- [ ] **21. Create first organization** — complete onboarding (auto-enrolls you as `owner` via `handle_new_organization`).
- [ ] **22. Create first price book items** — Price book → **Load example items** or add manually.
- [ ] **23. Test quote creation** — New quote → paste sample notes → Generate draft → edit a line → totals update.
- [ ] **24. Test the demo seed button** — confirm it lands you on a generated draft quote.

### H. Operate
- [ ] **25. Troubleshooting**
  | Error | Cause / fix |
  | --- | --- |
  | "Supabase isn't configured" on `/login` | `NEXT_PUBLIC_SUPABASE_*` missing — set + redeploy. |
  | `new row violates row-level security policy` | Not an editor of the org, or `0002_rls.sql` not applied. Re-run it. |
  | `violates check constraint "quotes_status_check"` | `0004` not applied — run it. |
  | Signup says "check your email" but none arrives | Email confirmation on + no SMTP — disable for testing or configure SMTP. |
  | `/admin` "not authorized" | Add your email to `ADMIN_EMAILS` and set `SUPABASE_SERVICE_ROLE_KEY`. |
  | `function next_quote_number does not exist` | `0001` not fully applied — re-run it. |
- [ ] **26. Rollback strategy**
  - Migrations are **forward-only**. To undo `0004`, run a reversing migration:
    ```sql
    alter table public.quotes drop constraint if exists quotes_status_check;
    alter table public.quotes add constraint quotes_status_check
      check (status in ('draft','sent','accepted','rejected'));
    -- WARNING: only safe if no rows are in 'ready'/'archived'.
    ```
  - For a clean reset in a throwaway project, drop the `public` schema and re-run `0001`–`0004`. **Never** do this on a project with real contractor data.
  - App rollback is independent (Vercel deployment promotion).
