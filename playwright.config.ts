import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config. The happy-path spec drives the public marketing flow
 * and the quote-builder UI that works without external services (mock AI,
 * client-side calculations). Auth-gated paths require a configured Supabase
 * project — see tests/e2e/README.md.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
