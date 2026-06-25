import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/utils";

/**
 * Handles the email-confirmation / OAuth redirect. Exchanges the `code` for a
 * session cookie, then sends the user into onboarding (or a requested path).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Validate the redirect target so a crafted ?next= can't be abused.
  const next = safeInternalPath(searchParams.get("next"), "/onboarding");

  if (code) {
    const supabase = createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
