import type { Metadata } from "next";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/app/ui";
import { PriceBookManager } from "@/components/price-book/PriceBookManager";
import type { PriceBookItem } from "@/lib/types/db";

export const metadata: Metadata = { title: "Price book" };

export default async function PriceBookPage() {
  const { supabase, organization, isEditor } = await requireOrg();

  const { data } = await supabase
    .from("price_book_items")
    .select("*")
    .eq("organization_id", organization.id)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const items = (data ?? []) as PriceBookItem[];

  return (
    <div>
      <PageHeader
        title="Price book"
        description="Your prices are the accuracy layer. The AI prefers these items, and every quote starts from them."
      />
      <PriceBookManager
        initialItems={items}
        currency={organization.default_currency || "USD"}
        defaultLaborRate={Number(organization.default_labor_rate ?? 0)}
        canEdit={isEditor}
      />
    </div>
  );
}
