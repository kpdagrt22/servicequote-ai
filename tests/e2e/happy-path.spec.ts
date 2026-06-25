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
 * Authenticated happy path — runs only when a test Supabase project + test
 * account are provided via env. Set:
 *   E2E_SUPABASE=1 E2E_EMAIL=... E2E_PASSWORD=...
 * (the account must already exist and have completed onboarding).
 */
const runAuthed = process.env.E2E_SUPABASE === "1" && !!process.env.E2E_EMAIL;

test.describe("Authenticated quote flow", () => {
  test.skip(!runAuthed, "Set E2E_SUPABASE=1 + E2E_EMAIL/E2E_PASSWORD to run the authenticated flow.");

  test("create a quote, edit a line item, and open the proposal", async ({ page }) => {
    // Log in.
    await page.goto("/login");
    await page.getByLabel("Email").fill(process.env.E2E_EMAIL!);
    await page.getByLabel("Password").fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Start a new quote.
    await page.getByRole("link", { name: "New quote" }).first().click();
    await expect(page).toHaveURL(/\/quotes\/new/);

    // Job details (use the sample) and generate.
    await page.getByRole("button", { name: "Use a sample" }).click();
    await page.getByRole("button", { name: "Generate Draft Quote" }).click();

    // Lands on the editable quote.
    await expect(page).toHaveURL(/\/quotes\/[0-9a-f-]+/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Line items" })).toBeVisible();

    // Add a line item and save.
    await page.getByRole("button", { name: "+ Add line" }).click();
    await page.getByRole("button", { name: /Save quote/ }).click();

    // Open the branded proposal.
    await page.getByRole("button", { name: /Preview & download PDF|Regenerate \/ Print PDF/ }).click();
  });
});
