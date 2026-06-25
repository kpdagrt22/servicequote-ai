import type { SupabaseClient } from "@supabase/supabase-js";
import type { Subscription } from "@/lib/types/db";

/**
 * Load an organization's subscription row (or null). Used by the entitlement
 * checks in server actions and by the dashboard/settings to display the plan.
 * RLS already restricts subscriptions to org members.
 */
export async function getSubscription(
  supabase: SupabaseClient,
  organizationId: string
): Promise<Subscription | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data as Subscription | null) ?? null;
}
