/**
 * Environment validation.
 *
 * Required (for full local functionality): the two public Supabase keys. Without
 * them the app still RUNS — it shows setup notices and uses the mock AI — but
 * accounts/persistence won't work. Everything else is optional and only enables
 * an integration. `buildEnvReport` is pure (takes an env object) so it is
 * unit-tested; `getEnvReport()` reads `process.env`.
 */

export const REQUIRED_PUBLIC_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export interface OptionalEnvSpec {
  key: string;
  enables: string;
}

export const OPTIONAL_ENV: OptionalEnvSpec[] = [
  { key: "SUPABASE_SERVICE_ROLE_KEY", enables: "internal admin view + Stripe webhook writes" },
  { key: "OPENAI_API_KEY", enables: "real OpenAI quote drafts (AI_PROVIDER=openai)" },
  { key: "ANTHROPIC_API_KEY", enables: "real Anthropic quote drafts (AI_PROVIDER=anthropic)" },
  { key: "RESEND_API_KEY", enables: "transactional email" },
  { key: "STRIPE_SECRET_KEY", enables: "billing / checkout" },
  { key: "STRIPE_WEBHOOK_SECRET", enables: "verified Stripe webhooks" },
  { key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", enables: "Stripe.js on the client" },
  { key: "ADMIN_EMAILS", enables: "access to the /admin debug page" },
  { key: "NEXT_PUBLIC_APP_URL", enables: "correct absolute URLs (defaults to localhost)" },
];

export interface EnvReport {
  ok: boolean;
  missingRequired: string[];
  presentRequired: string[];
  missingOptional: OptionalEnvSpec[];
  presentOptional: string[];
  warnings: string[];
}

function has(env: Record<string, string | undefined>, key: string): boolean {
  const v = env[key];
  return typeof v === "string" && v.trim().length > 0;
}

export function buildEnvReport(env: Record<string, string | undefined>): EnvReport {
  const missingRequired = REQUIRED_PUBLIC_ENV.filter((k) => !has(env, k));
  const presentRequired = REQUIRED_PUBLIC_ENV.filter((k) => has(env, k));
  const missingOptional = OPTIONAL_ENV.filter((o) => !has(env, o.key));
  const presentOptional = OPTIONAL_ENV.filter((o) => has(env, o.key)).map((o) => o.key);

  const warnings: string[] = [];
  if (missingRequired.length > 0) {
    warnings.push(
      `Missing required env: ${missingRequired.join(", ")} — auth & persistence are disabled until set.`
    );
  }
  const provider = (env.AI_PROVIDER || "mock").toLowerCase();
  if (provider === "openai" && !has(env, "OPENAI_API_KEY")) {
    warnings.push("AI_PROVIDER=openai but OPENAI_API_KEY is missing — falling back to mock AI.");
  }
  if (provider === "anthropic" && !has(env, "ANTHROPIC_API_KEY")) {
    warnings.push("AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is missing — falling back to mock AI.");
  }
  if (has(env, "STRIPE_SECRET_KEY") && !has(env, "STRIPE_WEBHOOK_SECRET")) {
    warnings.push("STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is missing — webhooks won't verify.");
  }

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    presentRequired,
    missingOptional,
    presentOptional,
    warnings,
  };
}

export function getEnvReport(): EnvReport {
  return buildEnvReport(process.env as Record<string, string | undefined>);
}
