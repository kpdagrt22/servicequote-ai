import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertCustomerBelongsToOrg,
  assertQuoteBelongsToOrg,
  assertPriceBookItemBelongsToOrg,
} from "@/lib/auth/organizations";

interface Row {
  table: string;
  id: string;
  organization_id: string;
}

/** Minimal chainable Supabase stub matching the helpers' query shape. */
function fakeSupabase(rows: Row[]): SupabaseClient {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          filters[col] = val;
          return builder;
        },
        maybeSingle: () => {
          const match = rows.find(
            (r) =>
              r.table === table &&
              r.id === filters["id"] &&
              r.organization_id === filters["organization_id"]
          );
          return Promise.resolve({ data: match ? { id: match.id } : null, error: null });
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

const ORG = "org-1";
const OTHER = "org-2";

describe("organization ownership helpers", () => {
  const supabase = fakeSupabase([
    { table: "customers", id: "c1", organization_id: ORG },
    { table: "quotes", id: "q1", organization_id: ORG },
    { table: "price_book_items", id: "p1", organization_id: ORG },
    { table: "customers", id: "cX", organization_id: OTHER },
  ]);

  it("returns true for an object in the org", async () => {
    expect(await assertCustomerBelongsToOrg(supabase, "c1", ORG)).toBe(true);
    expect(await assertQuoteBelongsToOrg(supabase, "q1", ORG)).toBe(true);
    expect(await assertPriceBookItemBelongsToOrg(supabase, "p1", ORG)).toBe(true);
  });

  it("returns false for an object in a DIFFERENT org (no cross-org access)", async () => {
    expect(await assertCustomerBelongsToOrg(supabase, "cX", ORG)).toBe(false);
    expect(await assertCustomerBelongsToOrg(supabase, "c1", OTHER)).toBe(false);
  });

  it("returns false for a non-existent id", async () => {
    expect(await assertQuoteBelongsToOrg(supabase, "nope", ORG)).toBe(false);
    expect(await assertPriceBookItemBelongsToOrg(supabase, "nope", ORG)).toBe(false);
  });
});
