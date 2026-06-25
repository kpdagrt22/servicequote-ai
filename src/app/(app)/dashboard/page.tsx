import type { Metadata } from "next";
import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader, StatCard, StatusBadge, EmptyState } from "@/components/app/ui";
import { DemoDataButton } from "@/components/app/DemoDataButton";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Quote, Customer } from "@/lib/types/db";
import type { QuoteStatus } from "@/lib/constants";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { supabase, organization, isEditor } = await requireOrg();
  const currency = organization.default_currency || "USD";

  const [{ data: quotesRaw }, { count: priceBookCount }] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, quote_number, title, status, total, created_at, customer:customers(name)")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("price_book_items")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id),
  ]);

  const quotes = (quotesRaw ?? []) as unknown as Array<
    Pick<Quote, "id" | "quote_number" | "title" | "status" | "total" | "created_at"> & {
      customer: Pick<Customer, "name"> | null;
    }
  >;

  const countBy = (s: QuoteStatus) => quotes.filter((q) => q.status === s).length;
  const pipelineValue = quotes
    .filter((q) => q.status === "draft" || q.status === "sent")
    .reduce((sum, q) => sum + Number(q.total || 0), 0);
  const acceptedValue = quotes
    .filter((q) => q.status === "accepted")
    .reduce((sum, q) => sum + Number(q.total || 0), 0);

  const recent = quotes.slice(0, 8);
  const needsPriceBook = (priceBookCount ?? 0) === 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome back — here's where ${organization.name} stands.`}
        action={
          <div className="flex items-center gap-2">
            {isEditor && <DemoDataButton />}
            <Link href="/quotes/new" className="btn-primary">New quote</Link>
          </div>
        }
      />

      {needsPriceBook && (
        <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold text-brand-900">Set up your price book first</p>
            <p className="text-sm text-brand-700">
              Your price book is the accuracy layer — it makes every quote faster and more correct.
            </p>
          </div>
          <Link href="/price-book" className="btn-primary">Set up price book</Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total quotes" value={quotes.length} />
        <StatCard label="Drafts" value={countBy("draft")} />
        <StatCard label="Sent" value={countBy("sent")} />
        <StatCard label="Accepted" value={countBy("accepted")} hint={formatCurrency(acceptedValue, currency)} />
        <StatCard label="Pipeline value" value={formatCurrency(pipelineValue, currency)} hint="Draft + sent" />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent quotes</h2>
          {quotes.length > 0 && (
            <Link href="/quotes" className="text-sm font-medium text-brand-700 hover:underline">View all →</Link>
          )}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            description="Describe a job and generate your first editable draft quote in a couple of minutes."
            cta={{ label: "Create your first quote", href: "/quotes/new" }}
          />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Quote</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/quotes/${q.id}`} className="font-medium text-brand-700 hover:underline">
                        {q.quote_number || "Draft"}
                      </Link>
                      <div className="text-xs text-gray-500">{q.title || "Untitled"}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{q.customer?.name || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(Number(q.total || 0), currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{formatDate(q.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
