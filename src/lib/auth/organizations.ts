import type { SupabaseClient } from "@supabase/supabase-js";
import { requireOrg, requireUser, type OrgContext } from "@/lib/org";

/**
 * Centralized organization auth + ownership helpers.
 *
 * Server actions and route handlers use these instead of re-implementing the
 * "is this object in my org?" check inline. Keeping the logic in one place means
 * a fix or tightening applies everywhere, and the checks compose with (never
 * replace) Postgres RLS — they are defense in depth, not the only line.
 *
 * Note: this app models one organization per user (the user's first org), so the
 * org is always derived from the authenticated session — never from a
 * client-supplied orgId. That removes a whole class of "act on another org by
 * passing its id" bugs.
 */

export { requireUser };
export type { OrgContext };

/** Require an authenticated user who is a member of an organization. */
export async function requireOrganizationMember(): Promise<OrgContext> {
  return requireOrg();
}

/** Require an authenticated user who is an owner/admin (editor) of their org. */
export async function requireOrganizationOwnerOrAdmin(): Promise<OrgContext> {
  const ctx = await requireOrg();
  if (!ctx.isEditor) {
    throw new Error("You don't have permission to perform this action.");
  }
  return ctx;
}

/** Convenience alias used by the quote/price-book/customer actions. */
export const requireOrganizationEditor = requireOrganizationOwnerOrAdmin;

async function rowExists(
  supabase: SupabaseClient,
  table: string,
  id: string,
  orgId: string
): Promise<boolean> {
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  return Boolean(data);
}

export function assertCustomerBelongsToOrg(
  supabase: SupabaseClient,
  customerId: string,
  orgId: string
): Promise<boolean> {
  return rowExists(supabase, "customers", customerId, orgId);
}

export function assertQuoteBelongsToOrg(
  supabase: SupabaseClient,
  quoteId: string,
  orgId: string
): Promise<boolean> {
  return rowExists(supabase, "quotes", quoteId, orgId);
}

export function assertPriceBookItemBelongsToOrg(
  supabase: SupabaseClient,
  itemId: string,
  orgId: string
): Promise<boolean> {
  return rowExists(supabase, "price_book_items", itemId, orgId);
}
