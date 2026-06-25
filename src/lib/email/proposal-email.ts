/**
 * Pure builder for the "your quote is ready" customer email.
 *
 * Kept pure (no I/O) so it is unit-tested. All caller-supplied values are
 * HTML-escaped before interpolation into the HTML body to avoid injection.
 * Sending is handled separately by src/lib/email/resend.ts.
 */

export interface ProposalEmailInput {
  customerName: string | null;
  businessName: string;
  quoteTitle: string | null;
  quoteNumber: string | null;
  totalFormatted: string;
  shareUrl: string;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildProposalEmail(input: ProposalEmailInput): BuiltEmail {
  const business = input.businessName?.trim() || "Your contractor";
  const greetingName = input.customerName?.trim() || "there";
  const project = input.quoteTitle?.trim() || "your project";
  const number = input.quoteNumber?.trim();

  const subject = number
    ? `Your quote from ${business} (${number})`
    : `Your quote from ${business}`;

  const text = [
    `Hi ${greetingName},`,
    ``,
    `${business} has prepared a quote for ${project}.`,
    `Estimated total: ${input.totalFormatted}.`,
    ``,
    `View the full proposal — including scope, assumptions and exclusions — and`,
    `approve or decline it here:`,
    input.shareUrl,
    ``,
    `This is an estimate; final pricing may change if the scope or site`,
    `conditions differ from those described.`,
    ``,
    `— ${business}`,
  ].join("\n");

  const eBusiness = escapeHtml(business);
  const eName = escapeHtml(greetingName);
  const eProject = escapeHtml(project);
  const eTotal = escapeHtml(input.totalFormatted);
  // shareUrl is an app-built URL (not user free text); still safe to place in href.
  const href = input.shareUrl;

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">
  <p>Hi ${eName},</p>
  <p><strong>${eBusiness}</strong> has prepared a quote for ${eProject}.</p>
  <p style="font-size:18px"><strong>Estimated total: ${eTotal}</strong></p>
  <p>
    <a href="${href}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">
      View &amp; respond to your proposal
    </a>
  </p>
  <p style="color:#6b7280;font-size:13px">Or paste this link into your browser:<br>${escapeHtml(href)}</p>
  <p style="color:#6b7280;font-size:13px">This is an estimate; final pricing may change if the scope or site conditions differ from those described.</p>
  <p style="color:#6b7280;font-size:13px">— ${eBusiness}</p>
</div>`;

  return { subject, html, text };
}
