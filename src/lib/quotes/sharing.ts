/**
 * Pure helpers for customer-facing quote sharing.
 *
 * A contractor "sends" a quote, which mints an unguessable share token and
 * exposes a read-only branded proposal at /p/<token>. These helpers are pure so
 * they can be unit-tested; the token generation + persistence happens in the
 * server action (src/lib/actions/quotes.ts).
 */
import type { QuoteStatus } from "@/lib/constants";

/** Statuses a quote may be shared/sent from. Drafts must be marked ready first. */
export const SHAREABLE_STATUSES: QuoteStatus[] = ["ready", "sent", "accepted", "rejected"];

export function canShareQuote(status: QuoteStatus): boolean {
  return SHAREABLE_STATUSES.includes(status);
}

/** A customer may still accept/decline only while the quote is awaiting them. */
export function canCustomerRespond(status: QuoteStatus): boolean {
  return status === "sent";
}

export function buildSharePath(token: string): string {
  return `/p/${token}`;
}

export function buildShareUrl(appUrl: string, token: string): string {
  const base = (appUrl || "").replace(/\/+$/, "");
  return `${base}${buildSharePath(token)}`;
}
