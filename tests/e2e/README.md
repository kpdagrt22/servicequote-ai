# End-to-end tests

These use [Playwright](https://playwright.dev/). The default suite runs against a
dev server with **no external services configured** and covers:

- the marketing → signup funnel,
- the pricing page,
- graceful degradation (login page renders without Supabase), and
- auth gating (protected routes redirect to `/login`).

## Run

```bash
npx playwright install   # first time only — downloads browsers
npm run test:e2e
```

The Playwright config starts `npm run dev` automatically (see
`playwright.config.ts`).

## Authenticated flow (the core "money path")

The full authenticated happy path (generate draft → edit a line → **save under
RLS** → open a **priced** branded proposal) is **skipped by default** because it
needs a real Supabase project. It asserts real correctness, not just navigation.

You only need a **throwaway** Supabase project — never point this at production.

1. Create a Supabase project and run the migrations in `supabase/migrations`
   (`0001` → `0004`, in order).
2. Grab the project URL, the **anon** key, and the **service-role** key.
3. Pick any test email/password (the account is created for you in step 4).
4. Provision the account **and** run the test in one command:

   ```bash
   SUPABASE_URL=https://<ref>.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> \
   E2E_SUPABASE=1 E2E_EMAIL=tester@example.com E2E_PASSWORD=supersecret \
   npm run test:e2e:authed
   ```

   `test:e2e:authed` runs `scripts/e2e-setup.mjs` (idempotent — creates/reuses a
   confirmed user, an onboarded org, and a tiny price book) and then Playwright.
   To only provision without running the test, use `npm run e2e:setup`.

The mock AI provider means quote generation needs **no AI keys**.

### In CI

The `e2e-authed` job in `.github/workflows/ci.yml` runs this flow **only** when
the `E2E_SUPABASE_URL` repository secret is set; otherwise it is a green no-op
and never blocks the public `e2e` job. Required repository secrets:

| Secret | Purpose |
| --- | --- |
| `E2E_SUPABASE_URL` | Project URL (also the on/off switch for the job) |
| `E2E_SUPABASE_ANON_KEY` | Anon key for the app under test |
| `E2E_SUPABASE_SERVICE_ROLE_KEY` | Service-role key for the setup script |
| `E2E_EMAIL` / `E2E_PASSWORD` | Test account credentials |

> The service-role key is used **only** by `scripts/e2e-setup.mjs`. It is never
> imported by application runtime code. Use a disposable project.
