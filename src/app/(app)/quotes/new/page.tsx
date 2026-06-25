import type { Metadata } from "next";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/app/ui";
import { NewQuoteWizard } from "@/components/quotes/NewQuoteWizard";
import { aiConfig } from "@/lib/config";
import type { Customer } from "@/lib/types/db";

export const metadata: Metadata = { title: "New quote" };

export default async function NewQuotePage() {
  const { supabase, organization } = await requireOrg();

  const [{ data: customers }, { count: priceBookCount }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone, city, state")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true }),
    supabase
      .from("price_book_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("active", true),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New quote" description="Describe the job and we'll draft an editable, line-item estimate." />
      <NewQuoteWizard
        customers={(customers ?? []) as Pick<Customer, "id" | "name" | "email" | "phone" | "city" | "state">[]}
        priceBookCount={priceBookCount ?? 0}
        aiProvider={aiConfig.effectiveProvider}
      />
    </div>
  );
}
