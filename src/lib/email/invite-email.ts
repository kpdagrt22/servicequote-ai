/**
 * Pure builder for the team-invitation email. Pure (no I/O) so it is unit-tested;
 * caller values are HTML-escaped. Sending happens in src/lib/email/resend.ts.
 */
import { escapeHtml } from "@/lib/email/proposal-email";
import { APP_NAME } from "@/lib/constants";

export interface InviteEmailInput {
  businessName: string;
  role: string;
  inviteUrl: string;
}

export interface BuiltInviteEmail {
  subject: string;
  html: string;
  text: string;
}

export function buildInviteEmail(input: InviteEmailInput): BuiltInviteEmail {
  const business = input.businessName?.trim() || "a team";
  const role = input.role === "admin" ? "an admin" : "a team member";

  const subject = `You're invited to join ${business} on ${APP_NAME}`;

  const text = [
    `You've been invited to join ${business} on ${APP_NAME} as ${role}.`,
    ``,
    `Accept your invitation:`,
    input.inviteUrl,
    ``,
    `If you weren't expecting this, you can ignore this email.`,
  ].join("\n");

  const eBusiness = escapeHtml(business);
  const href = input.inviteUrl;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
  <p>You've been invited to join <strong>${eBusiness}</strong> on ${escapeHtml(APP_NAME)} as ${escapeHtml(role)}.</p>
  <p>
    <a href="${href}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">
      Accept invitation
    </a>
  </p>
  <p style="color:#6b7280;font-size:13px">Or paste this link into your browser:<br>${escapeHtml(href)}</p>
  <p style="color:#6b7280;font-size:13px">If you weren't expecting this, you can ignore this email.</p>
</div>`;

  return { subject, html, text };
}
