import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { QuoteWorkspace } from "@/components/quotes/QuoteWorkspace";
import { QuoteTimeline } from "@/components/quotes/QuoteTimeline";
import type { Quote, QuoteLineItem, Customer, PriceBookItem, QuoteEvent } from "@/lib/types/db";

export const metadata: Metadata = { title: "Quote" };

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const { supabase, organization, isEditor } = await requireOrg();

  const { data: quoteData } = await supabase
    .from("quotes")
    .select("*, customer:customers(*)")
    .eq("id", params.id)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!quoteData) notFound();
  const quote = quoteData as unknown as Quote & { customer: Customer | null };

  const [{ data: lineItems }, { data: events }, { data: priceBook }] = await Promise.all([
    supabase.from("quote_line_items").select("*").eq("quote_id", quote.id).order("sort_order", { ascending: true }),
    supabase.from("quote_events").select("*").eq("quote_id", quote.id).order("created_at", { ascending: false }),
    supabase
      .from("price_book_items")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("active", true)
      .order("name", { ascending: true }),
  ]);

  const eventList = (events ?? []) as QuoteEvent[];
  const aiEvent = eventList.find((e) => e.event_type === "ai_generated");
  const aiInsights = (aiEvent?.metadata ?? null) as
    | {
        confidence?: number;
        used_fallback?: boolean;
        risk_flags?: string[];
        questions?: string[];
        cannot_price_items?: string[];
        missing_information?: string[];
      }
    | null;

  return (
    <div>
      <div className="mb-4">
        <Link href="/quotes" className="text-sm font-medium text-gray-500 hover:text-gray-900">← Back to quotes</Link>
      </div>

      <QuoteWorkspace
        quote={quote}
        customer={quote.customer}
        initialLineItems={(lineItems ?? []) as QuoteLineItem[]}
        priceBook={(priceBook ?? []) as PriceBookItem[]}
        org={{
          name: organization.name,
          currency: organization.default_currency || "USD",
          defaultLaborRate: Number(organization.default_labor_rate ?? 0),
          logoUrl: organization.logo_url,
        }}
        aiInsights={aiInsights}
        canEdit={isEditor}
      />

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Activity</h2>
        <QuoteTimeline events={eventList} />
      </div>
    </div>
  );
}
