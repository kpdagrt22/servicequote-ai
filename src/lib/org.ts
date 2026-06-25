import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/lib/types/db";
import type { OrgRole } from "@/lib/constants";
import { EDITOR_ROLES } from "@/lib/constants";

export interface OrgContext {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  organization: Organization;
  role: OrgRole;
  isEditor: boolean;
}

/**
 * Resolve the current user's first organization + role, or redirect.
 * - Supabase not configured  -> /login (which shows a setup notice)
 * - Not signed in            -> /login
 * - Signed in but no org yet  -> /onboarding
 *
 * Use at the top of every authenticated app page and in the app layout.
 */
export async function requireOrg(): Promise<OrgContext> {
  const supabase = createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role, organization:organizations(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const organization = (membership?.organization as Organization | undefined) ?? null;
  if (!membership || !organization) redirect("/onboarding");

  const role = membership.role as OrgRole;
  return {
    supabase,
    userId: user.id,
    email: user.email ?? null,
    organization,
    role,
    isEditor: EDITOR_ROLES.includes(role),
  };
}

/**
 * Like requireOrg but for routes that need a signed-in user WITHOUT requiring
 * an organization (e.g. the onboarding page itself).
 */
export async function requireUser(): Promise<{
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  profile: Profile | null;
}> {
  const supabase = createSupabaseServerClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, userId: user.id, email: user.email ?? null, profile: profile as Profile | null };
}

/** Returns the user's first organization or null (no redirect). */
export async function getOrganizationOrNull(): Promise<Organization | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("organization_members")
    .select("organization:organizations(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.organization as Organization | undefined) ?? null;
}
