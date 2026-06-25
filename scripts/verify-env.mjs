#!/usr/bin/env node
/**
 * verify:env — checks your environment for ServiceQuote AI.
 *
 * Reads .env.local / .env (if present) plus process.env and reports which
 * integrations are configured. Exits 1 only if a REQUIRED key is missing, so it
 * is safe to wire into CI without blocking the (intentionally optional) extras.
 *
 * No dependencies — plain Node ESM.
 */
import fs from "node:fs";
import path from "node:path";

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const OPTIONAL = [
  ["SUPABASE_SERVICE_ROLE_KEY", "internal admin + Stripe webhook writes"],
  ["OPENAI_API_KEY", "OpenAI quote drafts"],
  ["ANTHROPIC_API_KEY", "Anthropic quote drafts"],
  ["RESEND_API_KEY", "transactional email"],
  ["STRIPE_SECRET_KEY", "billing / checkout"],
  ["STRIPE_WEBHOOK_SECRET", "verified Stripe webhooks"],
  ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "Stripe.js on the client"],
  ["ADMIN_EMAILS", "/admin debug page access"],
  ["NEXT_PUBLIC_APP_URL", "absolute URLs"],
];

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  const text = fs.readFileSync(file, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const cwd = process.cwd();
const merged = {
  ...parseEnvFile(path.join(cwd, ".env")),
  ...parseEnvFile(path.join(cwd, ".env.local")),
  ...process.env,
};
const has = (k) => typeof merged[k] === "string" && merged[k].trim().length > 0;

console.log("ServiceQuote AI — environment check\n");

let missingRequired = 0;
console.log("Required:");
for (const k of REQUIRED) {
  const ok = has(k);
  if (!ok) missingRequired++;
  console.log(`  ${ok ? "✓" : "✗"} ${k}${ok ? "" : "  (MISSING)"}`);
}

console.log("\nOptional:");
for (const [k, why] of OPTIONAL) {
  console.log(`  ${has(k) ? "✓" : "·"} ${k} — ${why}`);
}

const provider = (merged.AI_PROVIDER || "mock").toLowerCase();
console.log(`\nAI provider: ${provider}`);
if (provider === "openai" && !has("OPENAI_API_KEY"))
  console.log("  ⚠ OPENAI_API_KEY missing — will fall back to mock AI.");
if (provider === "anthropic" && !has("ANTHROPIC_API_KEY"))
  console.log("  ⚠ ANTHROPIC_API_KEY missing — will fall back to mock AI.");
if (has("STRIPE_SECRET_KEY") && !has("STRIPE_WEBHOOK_SECRET"))
  console.log("  ⚠ STRIPE_WEBHOOK_SECRET missing — Stripe webhooks won't verify.");

if (missingRequired > 0) {
  console.log(`\n✗ ${missingRequired} required variable(s) missing. The app runs in setup/mock mode until set.`);
  process.exit(1);
}
console.log("\n✓ Required environment looks good.");
