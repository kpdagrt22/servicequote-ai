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

## Authenticated flow (optional)

The full authenticated happy path (create quote → edit line item → open
proposal) is **skipped by default** because it needs a real Supabase project.

To run it:

1. Configure `.env.local` with a Supabase project (see the root README).
2. Run the migrations in `supabase/migrations`.
3. Create a test user and complete onboarding for it once.
4. Run:

   ```bash
   E2E_SUPABASE=1 E2E_EMAIL=you@example.com E2E_PASSWORD=secret npm run test:e2e
   ```

The mock AI provider means the quote generation step needs **no AI keys**.
