/**
 * Centralised environment / feature-flag access.
 *
 * Every external integration in ServiceQuote AI is optional. This module is the
 * single place that decides whether a given integration is "configured". UI and
 * server code branch on these helpers so the app always runs — even with an
 * empty .env — by falling back to mock providers and on-screen setup notices.
 */

export const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  get isConfigured() {
    return Boolean(this.url && this.anonKey);
  },
  get hasServiceRole() {
    return Boolean(this.url && this.serviceRoleKey);
  },
};

export type AiProviderName = "mock" | "openai" | "anthropic";

export const aiConfig = {
  provider: (process.env.AI_PROVIDER || "mock") as AiProviderName,
  openaiKey: process.env.OPENAI_API_KEY || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  openaiModel: process.env.AI_OPENAI_MODEL || "gpt-4o-mini",
  anthropicModel: process.env.AI_ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
  /**
   * Resolve the provider we can actually use. If a real provider is selected
   * but its key is missing, fall back to the deterministic mock provider so the
   * product still works end-to-end during validation.
   */
  get effectiveProvider(): AiProviderName {
    if (this.provider === "openai" && this.openaiKey) return "openai";
    if (this.provider === "anthropic" && this.anthropicKey) return "anthropic";
    return "mock";
  },
};

export const resendConfig = {
  apiKey: process.env.RESEND_API_KEY || "",
  fromEmail: process.env.RESEND_FROM_EMAIL || "ServiceQuote AI <hello@example.com>",
  get isConfigured() {
    return Boolean(this.apiKey);
  },
};

export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  prices: {
    starter: process.env.STRIPE_PRICE_STARTER || "",
    pro: process.env.STRIPE_PRICE_PRO || "",
    team: process.env.STRIPE_PRICE_TEAM || "",
    setup: process.env.STRIPE_PRICE_SETUP || "",
  },
  get isConfigured() {
    return Boolean(this.secretKey);
  },
};

export const adminConfig = {
  /** Comma-separated allowlist of emails granted /admin access (besides owners). */
  emails: (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return this.emails.includes(email.toLowerCase());
  },
};
