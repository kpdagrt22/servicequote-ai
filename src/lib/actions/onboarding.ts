"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { organizationOnboardingSchema } from "@/lib/validation/org";
import { DEFAULT_PROPOSAL_FOOTER } from "@/lib/constants";
import { trackEvent } from "@/lib/observability/events";

export interface ActionResult {
  ok: boolean;
  error?: string;
  organizationId?: string;
}

/**
 * Create the user's organization from the onboarding form. The DB trigger
 * `handle_new_organization` enrols the creator as an 'owner' member, so RLS
 * lets them manage everything immediately. Also updates the profile name/email.
 */
export async function createOrganization(values: unknown): Promise<ActionResult> {
  const parsed = organizationOnboardingSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Invalid form data." };
  }
  const v = parsed.data;

  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase isn't configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  // Keep the profile in sync with what they entered.
  await supabase
    .from("profiles")
    .update({ full_name: v.ownerName ?? undefined, email: v.email ?? user.email })
    .eq("id", user.id);

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      owner_id: user.id,
      name: v.name,
      trade: v.trade,
      country: v.country,
      state: v.state,
      city: v.city,
      address: v.address,
      phone: v.phone,
      website: v.website,
      logo_url: v.logoUrl,
      default_currency: v.defaultCurrency,
      default_labor_rate: v.defaultLaborRate,
      default_material_markup_percent: v.defaultMaterialMarkupPercent,
      default_tax_percent: v.defaultTaxPercent,
      proposal_footer: v.proposalFooter ?? DEFAULT_PROPOSAL_FOOTER,
      license_text: v.licenseText,
      google_review_url: v.googleReviewUrl,
      onboarding_completed: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  trackEvent("onboarding_completed", { trade: v.trade });
  revalidatePath("/dashboard");
  return { ok: true, organizationId: data.id as string };
}
