"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizationEditor } from "@/lib/auth/organizations";
import { EXAMPLE_PRICE_BOOK } from "@/lib/price-book/examples";
import { generateDraftQuote } from "@/lib/actions/quotes";
import type { Trade } from "@/lib/constants";

export interface DemoResult {
  ok: boolean;
  error?: string;
  quoteId?: string;
}

/** Trade-appropriate sample job notes used by the demo + the founder demo script. */
const SAMPLE_JOB: Partial<Record<Trade, string>> = {
  electrical:
    "Customer wants 6 recessed lights installed in a living room, one dimmer switch, and replacement of two old outlets. Single-story home. Drywall ceiling. Customer wants clean finish.",
  hvac:
    "Customer wants a smart thermostat installed and a full AC tune-up before summer. Two-story home, single system. Reports weak airflow upstairs.",
  plumbing:
    "Customer wants their 50-gallon water heater replaced and a leaking kitchen faucet fixed. Single-family home, garage install.",
};

/**
 * Seed DEMO data into the CURRENT organization only (auth-gated, so it is safe
 * in production — a user can only seed their own org). Creates a demo customer,
 * loads example price book items if the book is empty, and generates one draft
 * quote from sample job notes. Returns the new quote id to navigate to.
 */
export async function seedDemoData(): Promise<DemoResult> {
  const { supabase, organization } = await requireOrganizationEditor();
  const trade = organization.trade as Trade;

  // 1. Demo customer (idempotent-ish: reuse if a demo customer already exists).
  const demoName = "Demo Customer (sample)";
  let customerId: string;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("name", demoName)
    .maybeSingle();
  if (existingCustomer) {
    customerId = existingCustomer.id as string;
  } else {
    const { data: cust, error: custErr } = await supabase
      .from("customers")
      .insert({
        organization_id: organization.id,
        name: demoName,
        email: "demo@example.com",
        phone: "(555) 010-0100",
        address: "100 Demo St",
        city: "Austin",
        state: "TX",
        postal_code: "78701",
        notes: "Created by Seed demo data.",
      })
      .select("id")
      .single();
    if (custErr) return { ok: false, error: custErr.message };
    customerId = cust.id as string;
  }

  // 2. Example price book items, only if the org has none yet.
  const { count } = await supabase
    .from("price_book_items")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id);
  if ((count ?? 0) === 0) {
    const examples = EXAMPLE_PRICE_BOOK[trade] ?? EXAMPLE_PRICE_BOOK.electrical ?? [];
    if (examples.length > 0) {
      await supabase.from("price_book_items").insert(
        examples.map((e) => ({
          organization_id: organization.id,
          trade,
          source: "seed",
          active: true,
          ...e,
        }))
      );
    }
  }

  // 3. Generate a draft quote from sample notes (uses mock AI when no key set).
  const jobDescription = SAMPLE_JOB[trade] ?? SAMPLE_JOB.electrical!;
  const result = await generateDraftQuote({
    customerId,
    jobDescription,
    jobLocation: "100 Demo St, Austin TX",
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/dashboard");
  revalidatePath("/quotes");
  revalidatePath("/price-book");
  return { ok: true, quoteId: result.quoteId };
}
