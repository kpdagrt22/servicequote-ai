"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "@/lib/config";

/**
 * Browser Supabase client. Returns `null` when Supabase isn't configured.
 * Memoised so we don't create a new client on every render.
 */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (!supabaseConfig.isConfigured) return null;
  if (browserClient) return browserClient;
  browserClient = createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey);
  return browserClient;
}
