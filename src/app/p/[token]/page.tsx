import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ProposalDocument } from "@/components/proposal/ProposalDocument";
import { CustomerResponse } from "@/components/proposal/CustomerResponse";
import { buildProposalView } from "@/lib/quotes/proposal";
import { canCustomerRespond } from "@/lib/quotes/sharing";
import { APP_NAME } from "@/lib/constants";
import type { Quote, QuoteLineItem, Customer, Organization } from "@/lib/types/db";

export const dynamic = "force-dynamic";
// Customer proposals are private links — never index them.
export const metadata: Metadata = { title: "Proposal", robots: { index: false, follow: false } };

const VIEWABLE = new Set(["sent", "accepted", "rejected"]);

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">{children}</div>
      <footer className="pb-10 text-center text-xs text-gray-400">
        Powered by {APP_NAME}
      </footer>
    </div>
  );
}

export default async function PublicProposalPage({ params }: { params: { token: string } }) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return (
      <Shell>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
          This proposal link isn&apos;t available right now. Please contact your contractor.
        </div>
      </Shell>
    );
  }

  const { data: quoteData } = await admin
    .from("quotes")
    .select("*, customer:customers(*), organization:organizations(*)")
    .eq("share_token", params.token)
    .maybeSingle();
  if (!quoteData) notFound();

  const quote = quoteData as unknown as Quote & {
    customer: Customer | null;
    organization: Organization;
  };
  // Only quotes that have actually been sent (or already responded to) are public.
  if (!VIEWABLE.has(quote.status)) notFound();

  const { data: liData } = await admin
    .from("quote_line_items")
    .select("*")
    .eq("quote_id", quote.id)
    .order("sort_order", { ascending: true });

  let jobLocation: string | null = null;
  if (quote.quote_request_id) {
    const { data } = await admin
      .from("quote_requests")
      .select("job_location")
      .eq("id", quote.quote_request_id)
      .maybeSingle();
    jobLocation = (data?.job_location as string | null) ?? null;
  }

  // Best-effort view tracking (never blocks rendering).
  await admin
    .from("quotes")
    .update({ customer_view_count: (quote.customer_view_count ?? 0) + 1 })
    .eq("id", quote.id);
  await admin.from("quote_events").insert({
    organization_id: quote.organization_id,
    quote_id: quote.id,
    event_type: "proposal_viewed",
    metadata: { via: "public_link" },
  });

  const view = buildProposalView({
    quote,
    lineItems: (liData ?? []) as QuoteLineItem[],
    organization: { ...quote.organization, email: null },
    customer: quote.customer,
    jobLocation,
  });

  return (
    <Shell>
      <div className="mb-6">
        <CustomerResponse
          token={params.token}
          respondable={canCustomerRespond(quote.status)}
          initialResponse={quote.customer_response}
        />
      </div>
      <ProposalDocument view={view} />
    </Shell>
  );
}
