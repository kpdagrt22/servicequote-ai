/**
 * Quote status lifecycle — single source of truth.
 *
 * Lifecycle:
 *   draft     — still being edited
 *   ready     — reviewed, proposal generated, ready to send
 *   sent      — sent to the customer
 *   accepted  — customer accepted
 *   rejected  — customer rejected
 *   archived  — hidden from the active workflow
 *
 * Transitions are explicit and validated on the server (`updateQuoteStatus`)
 * and reflected in the UI (`QuoteWorkspace`). Reopen/restore edges (→ draft)
 * are the ONLY way back out of ready/rejected/archived, so e.g. an accepted
 * quote can never silently become a draft.
 */

export const QUOTE_STATUSES = [
  "draft",
  "ready",
  "sent",
  "accepted",
  "rejected",
  "archived",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  archived: "Archived",
};

export type QuoteStatusBadgeVariant =
  | "gray"
  | "amber"
  | "blue"
  | "green"
  | "red"
  | "slate";

export const QUOTE_STATUS_BADGE_VARIANT: Record<QuoteStatus, QuoteStatusBadgeVariant> = {
  draft: "gray",
  ready: "amber",
  sent: "blue",
  accepted: "green",
  rejected: "red",
  archived: "slate",
};

/**
 * Allowed forward (and reopen/restore) transitions. Anything not listed here is
 * rejected. Required allowed edges from the spec are all present; the forbidden
 * ones (accepted→draft, rejected→accepted, archived→accepted, random) are absent.
 */
export const QUOTE_STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["ready", "archived"],
  ready: ["sent", "draft", "archived"], // draft = reopen for editing
  sent: ["accepted", "rejected", "archived"],
  accepted: ["archived"],
  rejected: ["draft", "archived"], // draft = reopen to revise
  archived: ["draft"], // restore
};

/** Statuses in which the quote body/line items may be edited. */
export const EDITABLE_QUOTE_STATUSES: QuoteStatus[] = ["draft"];

export function isQuoteStatus(value: unknown): value is QuoteStatus {
  return typeof value === "string" && (QUOTE_STATUSES as readonly string[]).includes(value);
}

export function canTransitionQuoteStatus(from: QuoteStatus, to: QuoteStatus): boolean {
  if (from === to) return false;
  return (QUOTE_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function getAllowedTransitions(from: QuoteStatus): QuoteStatus[] {
  return QUOTE_STATUS_TRANSITIONS[from] ?? [];
}

export function getQuoteStatusLabel(status: QuoteStatus): string {
  return QUOTE_STATUS_LABELS[status] ?? status;
}

export function getQuoteStatusBadgeVariant(status: QuoteStatus): QuoteStatusBadgeVariant {
  return QUOTE_STATUS_BADGE_VARIANT[status] ?? "gray";
}

export function isQuoteEditable(status: QuoteStatus): boolean {
  return EDITABLE_QUOTE_STATUSES.includes(status);
}

/**
 * Human-friendly label for the BUTTON that performs a transition to `to`,
 * given the current status `from` (so "→ draft" reads as Reopen/Restore).
 */
export function getTransitionActionLabel(from: QuoteStatus, to: QuoteStatus): string {
  if (to === "draft") {
    if (from === "archived") return "Restore to draft";
    return "Reopen as draft";
  }
  switch (to) {
    case "ready":
      return "Mark ready";
    case "sent":
      return "Mark as sent";
    case "accepted":
      return "Mark accepted";
    case "rejected":
      return "Mark rejected";
    case "archived":
      return "Archive";
    default:
      return `Mark ${getQuoteStatusLabel(to)}`;
  }
}
