import type { Metadata } from "next";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/app/ui";
import { CustomersManager } from "@/components/customers/CustomersManager";
import type { Customer } from "@/lib/types/db";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const { supabase, organization, isEditor } = await requireOrg();

  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Customers" description="The people you quote. Reused across quotes and proposals." />
      <CustomersManager initialCustomers={(data ?? []) as Customer[]} canEdit={isEditor} />
    </div>
  );
}
