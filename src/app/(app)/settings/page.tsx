import type { Metadata } from "next";
import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/app/ui";
import { SettingsForm } from "@/components/settings/SettingsForm";
import {
  TeamManager,
  type TeamMemberView,
  type PendingInviteView,
} from "@/components/settings/TeamManager";
import { getSubscription } from "@/lib/billing/subscription";
import { planFromSubscription } from "@/lib/billing/entitlements";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, organization, isEditor, userId } = await requireOrg();

  const subscription = await getSubscription(supabase, organization.id);
  const plan = planFromSubscription(subscription);

  let members: TeamMemberView[] = [];
  let invites: PendingInviteView[] = [];
  let teamUnavailable = false;

  const admin = createSupabaseAdminClient();
  if (admin) {
    const [{ data: m }, { data: inv }] = await Promise.all([
      admin
        .from("organization_members")
        .select("user_id, role, created_at, profile:profiles(email, full_name)")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: true }),
      admin
        .from("organization_invitations")
        .select("id, email, role, expires_at")
        .eq("organization_id", organization.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    const mList = (m ?? []) as unknown as Array<{
      user_id: string;
      role: string;
      profile: { email: string | null; full_name: string | null } | null;
    }>;
    members = mList.map((row) => ({
      userId: row.user_id,
      email: row.profile?.email ?? null,
      fullName: row.profile?.full_name ?? null,
      role: row.role,
      isYou: row.user_id === userId,
    }));
    const iList = (inv ?? []) as unknown as Array<{
      id: string;
      email: string;
      role: string;
      expires_at: string;
    }>;
    invites = iList.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      expiresAt: row.expires_at,
    }));
  } else {
    teamUnavailable = true;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Your business profile, pricing defaults, and proposal branding." />
      <SettingsForm organization={organization} canEdit={isEditor} />

      {/* Billing */}
      <div className="card mt-6 flex items-center justify-between p-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Plan</h2>
          <p className="mt-1 text-sm text-gray-500">
            Current plan: <strong className="capitalize">{plan ?? "Free"}</strong>
            {!plan && " — limited number of quotes."}
          </p>
        </div>
        <Link href="/pricing" className="btn-secondary">{plan ? "Manage plan" : "Upgrade"}</Link>
      </div>

      {/* Team */}
      {teamUnavailable ? (
        <div className="card mt-6 p-6 text-sm text-gray-500">
          Team management needs <code>SUPABASE_SERVICE_ROLE_KEY</code> configured on the server.
        </div>
      ) : (
        <TeamManager members={members} invites={invites} canEdit={isEditor} />
      )}
    </div>
  );
}
