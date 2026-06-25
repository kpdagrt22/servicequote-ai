"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/org";
import { organizationOnboardingSchema } from "@/lib/validation/org";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Update the current organization's profile/branding/pricing defaults. */
export async function updateOrganizationSettings(values: unknown): Promise<ActionResult> {
  const parsed = organizationOnboardingSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };
  const v = parsed.data;
  const { supabase, organization, isEditor } = await requireOrg();
  if (!isEditor) return { ok: false, error: "Only owners and admins can change settings." };

  const { error } = await supabase
    .from("organizations")
    .update({
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
      proposal_footer: v.proposalFooter,
      license_text: v.licenseText,
      google_review_url: v.googleReviewUrl,
    })
    .eq("id", organization.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}
