import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseConfig } from "@/lib/config";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Server-side Supabase client bound to the request cookies. Returns `null` when
 * Supabase isn't configured so callers can render a setup notice instead of
 * crashing — the whole app is designed to run with an empty .env.
 */
export function createSupabaseServerClient() {
  if (!supabaseConfig.isConfigured) return null;
  const cookieStore = cookies();

  return createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — cookies are read-only here.
          // Session refresh is handled by middleware, so this is safe to ignore.
        }
      },
    },
  });
}

/** Convenience: the authenticated user, or null. */
export async function getCurrentUser() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
