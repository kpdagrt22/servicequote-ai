import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { PrintToolbar } from "@/components/proposal/PrintToolbar";
import { ProposalDocument } from "@/components/proposal/ProposalDocument";
import { buildProposalView } from "@/lib/quotes/proposal";
import type { Quote, QuoteLineItem, Customer } from "@/lib/types/db";

export const metadata: Metadata = { title: "Proposal" };

export default async function ProposalPrintPage({ params }: { params: { id: string } }) {
  const { supabase, organization } = await requireOrg();

  const { data: quoteData } = await supabase
    .from("quotes")
    .select("*, customer:customers(*)")
    .eq("id", params.id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!quoteData) notFound();
  const quote = quoteData as unknown as Quote & { customer: Customer | null };

  const [{ data: liData }, jobLocation] = await Promise.all([
    supabase
      .from("quote_line_items")
      .select("*")
      .eq("quote_id", quote.id)
      .order("sort_order", { ascending: true }),
    quote.quote_request_id
      ? supabase
          .from("quote_requests")
          .select("job_location")
          .eq("id", quote.quote_request_id)
          .maybeSingle()
          .then(({ data }) => (data?.job_location as string | null) ?? null)
      : Promise.resolve(null),
  ]);

  const view = buildProposalView({
    quote,
    lineItems: (liData ?? []) as QuoteLineItem[],
    organization: { ...organization, email: null },
    customer: quote.customer,
    jobLocation,
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintToolbar backHref={`/quotes/${quote.id}`} />

      <div className="mx-auto my-6 max-w-3xl">
        <ProposalDocument view={view} />
      </div>
    </div>
  );
}
