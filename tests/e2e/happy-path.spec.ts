import { test, expect } from "@playwright/test";

/**
 * Public happy-path E2E.
 *
 * This runs WITHOUT any external services (no Supabase, no AI keys) and proves
 * the core marketing → signup funnel and the app's graceful-degradation +
 * auth-gating behaviour. The full authenticated flow (create customer → create
 * quote → edit line items → generate proposal) requires a configured test
 * Supabase project; see tests/e2e/README.md and the guarded test below.
 */

test.describe("Marketing & funnel", () => {
  test("landing page shows the hero and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Create professional service quotes in minutes/i })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Create Your First Quote" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Join Founding Contractors" }).first()).toBeVisible();
  });

  test("primary CTA leads to signup", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Create Your First Quote" }).first().click();
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole("heading", { name: /Create your account/i })).toBeVisible();
  });

  test("pricing page lists the plans and setup service", async ({ page }) => {
    await page.goto("/pricing");
    // exact:true — otherwise "Pro" substring-matches the footer "Product" heading.
    await expect(page.getByRole("heading", { name: "Starter", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Team", exact: true })).toBeVisible();
    await expect(page.getByText("Done-for-you setup")).toBeVisible();
  });
});

test.describe("Graceful degradation & auth gating", () => {
  test("login page renders even with no Supabase configured", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
  });

  test("protected dashboard redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

/**
 * Authenticated happy path — the core "money path" run against a REAL Supabase
 * project under real Row Level Security. It is SKIPPED unless a test project and
 * account are supplied via env:
 *   E2E_SUPABASE=1 E2E_EMAIL=... E2E_PASSWORD=...
 * The account is provisioned (idempotently) by `scripts/e2e-setup.mjs`; run it
 * first (or use `npm run test:e2e:authed`, which runs it for you). AI runs on
 * the deterministic mock provider, so no AI keys are required.
 *
 * Unlike a smoke test, this asserts real CORRECTNESS: the draft persists under
 * RLS (the Save button confirms "Saved ✓") and the branded proposal renders a
 * positive total computed from the line items.
 */
const runAuthed = process.env.E2E_SUPABASE === "1" && !!process.env.E2E_EMAIL;

test.describe("Authenticated quote flow", () => {
  test.skip(!runAuthed, "Set E2E_SUPABASE=1 + E2E_EMAIL/E2E_PASSWORD to run the authenticated flow.");

  test("generate, edit, save (under RLS), and open a priced proposal", async ({ page }) => {
    // 1. Log in with the provisioned test account.
    await page.goto("/login");
    await page.getByLabel("Email").fill(process.env.E2E_EMAIL!);
    await page.getByLabel("Password").fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    // 2. Start a new quote (navigate directly to avoid nav-label fragility).
    await page.goto("/quotes/new");
    await expect(page).toHaveURL(/\/quotes\/new/);

    // 3. No customer needed; use the sample job notes and generate the draft.
    await page.getByRole("button", { name: "No customer yet" }).click();
    await page.getByRole("button", { name: "Use a sample" }).click();
    await page.getByRole("button", { name: "Generate Draft Quote" }).click();

    // 4. AI extraction (mock) persists a draft quote + line items, then redirects.
    await expect(page).toHaveURL(/\/quotes\/[0-9a-f-]+/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Line items" })).toBeVisible();
    // The mock should have produced at least one editable line item.
    await expect(page.getByPlaceholder("Item name").first()).toBeVisible();

    // 5. Edit: add a NAMED line (a blank name fails server-side save validation),
    //    then save. "Saved ✓" proves the write round-tripped through RLS.
    await page.getByRole("button", { name: "+ Add line" }).click();
    await page.getByPlaceholder("Item name").last().fill("E2E added line item");
    await page.getByRole("button", { name: "Save quote" }).click();
    await expect(page.getByRole("button", { name: "Saved ✓" })).toBeVisible({ timeout: 20_000 });

    // 6. Open the branded proposal (a new tab) and assert it is actually priced.
    const [proposal] = await Promise.all([
      page.waitForEvent("popup"),
      page
        .getByRole("button", { name: /Preview & download PDF|Regenerate \/ Print PDF/ })
        .click(),
    ]);
    await proposal.waitForLoadState();
    await expect(proposal.getByText("QUOTE", { exact: true }).first()).toBeVisible();
    // A positive currency amount must render — proves totals were computed, not $0.00.
    await expect(proposal.getByText(/\$[1-9][\d,]*\.\d{2}/).first()).toBeVisible();
  });
});
