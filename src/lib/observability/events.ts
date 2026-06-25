/**
 * Minimal, dependency-free product analytics + error wrapper.
 *
 * `trackEvent` logs a structured product event. If PostHog/Sentry are wired up
 * later (env keys present), this is the single place to forward them — today it
 * just logs in dev so nothing is sent anywhere and no secrets are emitted.
 *
 * Isomorphic: safe to call from server actions or client components.
 */

export const PRODUCT_EVENTS = [
  "onboarding_completed",
  "price_book_item_created",
  "quote_created",
  "ai_quote_generated",
  "proposal_generated",
  "quote_status_changed",
  "pdf_downloaded",
  "quote_sent",
  "quote_emailed",
  "customer_responded",
  "invitation_sent",
  "invitation_accepted",
] as const;
export type ProductEvent = (typeof PRODUCT_EVENTS)[number];

export type EventProps = Record<string, string | number | boolean | null | undefined>;

/** Keys that must never be logged, even if accidentally passed in props. */
const REDACT = /(key|token|secret|password|authorization)/i;

function sanitize(props: EventProps): EventProps {
  const out: EventProps = {};
  for (const [k, v] of Object.entries(props)) {
    out[k] = REDACT.test(k) ? "[redacted]" : v;
  }
  return out;
}

export function trackEvent(event: ProductEvent, props: EventProps = {}): void {
  const safe = sanitize(props);
  // Forwarding hook (PostHog/Mixpanel/etc.) goes here when configured.
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[event] ${event}`, safe);
  }
}

/**
 * Log an error without leaking sensitive context. When `ERROR_WEBHOOK_URL` is
 * set (a server-only env — Sentry tunnel, Slack/Discord webhook, or any JSON
 * sink) the sanitized error is forwarded best-effort. The env is never exposed
 * to the client (no NEXT_PUBLIC_ prefix), so forwarding only happens server-side.
 */
export function captureError(error: unknown, context: EventProps = {}): void {
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error("[error]", message, sanitize(context));

  const sink = typeof process !== "undefined" ? process.env.ERROR_WEBHOOK_URL : undefined;
  if (sink) {
    // Fire-and-forget; never let observability break the request.
    void fetch(sink, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: "error",
        message,
        context: sanitize(context),
        at: new Date().toISOString(),
      }),
    }).catch(() => {});
  }
}
