"use server";

import { revalidatePath } from "next/cache";
import { requireOrganizationEditor, requireUser } from "@/lib/auth/organizations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  normalizeEmail,
  isValidEmail,
  isInvitableRole,
  isInvitationExpired,
  emailsMatch,
} from "@/lib/org/invitations";
import { buildInviteEmail } from "@/lib/email/invite-email";
import { sendEmail, isEmailConfigured } from "@/lib/email/resend";
import { appUrl } from "@/lib/config";
import { trackEvent } from "@/lib/observability/events";
import type { OrganizationInvitation } from "@/lib/types/db";

export interface TeamActionResult {
  ok: boolean;
  error?: string;
  inviteUrl?: string;
  emailed?: boolean;
  organizationId?: string;
}

function inviteUrlFor(token: string): string {
  return `${appUrl.replace(/\/+$/, "")}/invite/${token}`;
}

/** Invite a teammate by email (owner/admin only). Never invites a second owner. */
export async function inviteMember(input: { email: string; role: string }): Promise<TeamActionResult> {
  const { supabase, organization, userId } = await requireOrganizationEditor();

  const email = normalizeEmail(input?.email ?? "");
  if (!isValidEmail(email)) return { ok: false, error: "Enter a valid email address." };
  const role = isInvitableRole(input?.role) ? input.role : "member";

  const { data: invite, error } = await supabase
    .from("organization_invitations")
    .insert({ organization_id: organization.id, email, role, invited_by: userId })
    .select("token")
    .single();
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: false, error: "There's already a pending invitation for that email." };
    }
    return { ok: false, error: error.message };
  }

  const url = inviteUrlFor(invite.token as string);
  let emailed = false;
  if (isEmailConfigured()) {
    const built = buildInviteEmail({ businessName: organization.name, role, inviteUrl: url });
    const res = await sendEmail({ to: email, ...built });
    emailed = res.ok;
  }
  trackEvent("invitation_sent", { role, emailed });
  revalidatePath("/settings");
  return { ok: true, inviteUrl: url, emailed };
}

/** Revoke a pending invitation (owner/admin only). */
export async function revokeInvitation(invitationId: string): Promise<TeamActionResult> {
  const { supabase, organization } = await requireOrganizationEditor();
  const { error } = await supabase
    .from("organization_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("organization_id", organization.id)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Accept an invitation. The invitee is signed in but not yet a member, so this
 * runs through the service-role client (RLS would otherwise block reading the
 * invite + inserting the membership). We verify the token, that it is pending +
 * unexpired, and that the signed-in user's email matches the invited email.
 */
export async function acceptInvitation(token: string): Promise<TeamActionResult> {
  const { userId, email } = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Invitations aren't available right now (missing service role)." };

  const { data } = await admin
    .from("organization_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!data) return { ok: false, error: "This invitation link is invalid." };
  const inv = data as OrganizationInvitation;

  if (inv.status !== "pending") {
    return { ok: false, error: "This invitation has already been used or was revoked." };
  }
  if (isInvitationExpired(inv.expires_at, new Date())) {
    return { ok: false, error: "This invitation has expired. Ask for a new one." };
  }
  if (!emailsMatch(email, inv.email)) {
    return {
      ok: false,
      error: `This invitation was sent to ${inv.email}. Sign in with that email to accept it.`,
    };
  }

  // Make sure the profile exists, then enroll (both idempotent).
  await admin.from("profiles").upsert({ id: userId, email }, { onConflict: "id" });
  const { error: memErr } = await admin
    .from("organization_members")
    .upsert(
      { organization_id: inv.organization_id, user_id: userId, role: inv.role },
      { onConflict: "organization_id,user_id" }
    );
  if (memErr) return { ok: false, error: memErr.message };

  await admin
    .from("organization_invitations")
    .update({ status: "accepted", accepted_by: userId, accepted_at: new Date().toISOString() })
    .eq("id", inv.id);

  trackEvent("invitation_accepted", { role: inv.role });
  revalidatePath("/dashboard");
  return { ok: true, organizationId: inv.organization_id };
}
