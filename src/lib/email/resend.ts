/**
 * Thin Resend email sender using the REST API via fetch (no SDK dependency).
 *
 * Degrades gracefully: when RESEND_API_KEY is absent it returns `skipped: true`
 * instead of throwing, so callers (e.g. the send-quote action) can still return
 * the shareable link for the contractor to copy manually.
 */
import { resendConfig } from "@/lib/config";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

export function isEmailConfigured(): boolean {
  return resendConfig.isConfigured;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (!resendConfig.isConfigured) {
    return { ok: false, skipped: true, error: "Email not configured." };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendConfig.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, error: `Resend error: ${res.status} ${detail}` };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: json.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
