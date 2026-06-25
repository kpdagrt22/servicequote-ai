/**
 * E2E setup — provision a known test account for the authenticated Playwright
 * happy path against a REAL (throwaway) Supabase project.
 *
 * It is idempotent and safe to run repeatedly. Using the SERVICE-ROLE key it:
 *   1. creates (or reuses) a confirmed auth user with a known password,
 *   2. ensures the matching profile row,
 *   3. ensures one organization owned by that user with onboarding completed,
 *   4. ensures the owner membership row, and
 *   5. seeds a tiny price book (rows tagged source='e2e') so quotes have prices.
 *
 * It NEVER alters schema or RLS, and is run ONLY from `scripts/` — it is never
 * imported by application runtime code. No secrets are hardcoded; everything
 * comes from the environment.
 *
 * Required env:
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   E2E_EMAIL
 *   E2E_PASSWORD
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   E2E_EMAIL=tester@example.com E2E_PASSWORD=supersecret \
 *   node scripts/e2e-setup.mjs
 */

import { createClient } from "@supabase/supabase-js";

const ORG_NAME = "E2E Test Electric";
const ORG_TRADE = "electrical";

const PRICE_BOOK = [
  {
    trade: "electrical",
    category: "Devices",
    name: "Install GFCI receptacle",
    description: "Supply + install GFCI outlet and plate.",
    unit: "each",
    default_quantity: 1,
    material_cost: 18,
    labor_minutes: 45,
    markup_percent: 20,
  },
  {
    trade: "electrical",
    category: "Service",
    name: "200A panel upgrade",
    description: "Replace panel, incl. permit coordination.",
    unit: "job",
    default_quantity: 1,
    material_cost: 900,
    labor_minutes: 480,
    markup_percent: 20,
  },
];

function fail(message) {
  console.error(`\n✗ e2e-setup: ${message}\n`);
  process.exit(1);
}

function readEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const email = process.env.E2E_EMAIL || "";
  const password = process.env.E2E_PASSWORD || "";

  const missing = [];
  if (!url) missing.push("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!email) missing.push("E2E_EMAIL");
  if (!password) missing.push("E2E_PASSWORD");
  if (missing.length > 0) {
    fail(`missing required env: ${missing.join(", ")}`);
  }
  return { url, serviceRoleKey, email, password };
}

/** Find an existing auth user by email (paginates — fine for a test project). */
async function findUserByEmail(admin, email) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`listUsers failed: ${error.message}`);
    const found = (data?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === target);
    if (found) return found;
    if (!data || data.users.length < 200) break; // last page
  }
  return null;
}

async function ensureUser(admin, email, password) {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Tester" },
  });

  if (created.data?.user) {
    return created.data.user;
  }

  // Likely "already registered" — reuse and reset the password to the known one
  // so login is deterministic across runs.
  const existing = await findUserByEmail(admin, email);
  if (!existing) {
    fail(`could not create or find the test user (${email}): ${created.error?.message ?? "unknown error"}`);
  }
  const updated = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (updated.error) fail(`updateUserById failed: ${updated.error.message}`);
  return existing;
}

async function ensureProfile(admin, user) {
  const { error } = await admin.from("profiles").upsert(
    { id: user.id, email: user.email, full_name: "E2E Tester" },
    { onConflict: "id" }
  );
  if (error) fail(`profile upsert failed: ${error.message}`);
}

async function ensureOrganization(admin, user) {
  const { data: existing, error: selErr } = await admin
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selErr) fail(`organization lookup failed: ${selErr.message}`);

  let orgId = existing?.id;
  if (!orgId) {
    const { data: created, error: insErr } = await admin
      .from("organizations")
      .insert({
        owner_id: user.id,
        name: ORG_NAME,
        trade: ORG_TRADE,
        country: "US",
        state: "TX",
        city: "Austin",
        default_currency: "USD",
        default_labor_rate: 90,
        default_material_markup_percent: 20,
        default_tax_percent: 8.25,
        onboarding_completed: true,
      })
      .select("id")
      .single();
    if (insErr) fail(`organization insert failed: ${insErr.message}`);
    orgId = created.id;
  } else {
    // Make sure onboarding is marked complete so requireOrg() doesn't bounce to /onboarding.
    const { error: upErr } = await admin
      .from("organizations")
      .update({ onboarding_completed: true })
      .eq("id", orgId);
    if (upErr) fail(`organization update failed: ${upErr.message}`);
  }

  // The handle_new_organization trigger enrolls the owner on insert, but upsert
  // here keeps re-runs and pre-existing orgs consistent.
  const { error: memErr } = await admin
    .from("organization_members")
    .upsert(
      { organization_id: orgId, user_id: user.id, role: "owner" },
      { onConflict: "organization_id,user_id" }
    );
  if (memErr) fail(`membership upsert failed: ${memErr.message}`);

  return orgId;
}

async function ensurePriceBook(admin, orgId) {
  // Idempotent: clear our tagged rows, then re-insert a known set.
  const { error: delErr } = await admin
    .from("price_book_items")
    .delete()
    .eq("organization_id", orgId)
    .eq("source", "e2e");
  if (delErr) fail(`price book cleanup failed: ${delErr.message}`);

  const rows = PRICE_BOOK.map((p) => ({ ...p, organization_id: orgId, active: true, source: "e2e" }));
  const { error: insErr } = await admin.from("price_book_items").insert(rows);
  if (insErr) fail(`price book insert failed: ${insErr.message}`);
}

async function main() {
  const { url, serviceRoleKey, email, password } = readEnv();
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`e2e-setup: target ${url}`);
  const user = await ensureUser(admin, email, password);
  console.log(`  ✓ user ${user.email} (${user.id})`);
  await ensureProfile(admin, user);
  console.log(`  ✓ profile ensured`);
  const orgId = await ensureOrganization(admin, user);
  console.log(`  ✓ organization ${orgId} (onboarding complete, owner enrolled)`);
  await ensurePriceBook(admin, orgId);
  console.log(`  ✓ price book seeded (${PRICE_BOOK.length} items, source='e2e')`);
  console.log(`\n✓ e2e-setup complete — ready for: npm run test:e2e\n`);
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
