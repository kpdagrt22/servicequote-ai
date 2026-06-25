import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/config";

/**
 * Service-role Supabase client that BYPASSES Row Level Security.
 *
 * Use ONLY in trusted server contexts (webhooks, the internal /admin page) and
 * NEVER expose it to the browser. Returns `null` when the service-role key
 * isn't configured.
 */
export function createSupabaseAdminClient() {
  if (!supabaseConfig.hasServiceRole) return null;
  return createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
