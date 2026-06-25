import type { Metadata } from "next";
import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader, StatusBadge, EmptyState } from "@/components/app/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/constants";
import type { Quote, Customer } from "@/lib/types/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Quotes" };

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { supabase, organization } = await requireOrg();
  const currency = organization.default_currency || "USD";
  const statusFilter = QUOTE_STATUSES.includes(searchParams.status as QuoteStatus)
    ? (searchParams.status as QuoteStatus)
    : null;

  let query = supabase
    .from("quotes")
    .select("id, quote_number, title, status, total, valid_until, created_at, customer:customers(name)")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data } = await query;
  const quotes = (data ?? []) as unknown as Array<
    Pick<Quote, "id" | "quote_number" | "title" | "status" | "total" | "valid_until" | "created_at"> & {
      customer: Pick<Customer, "name"> | null;
    }
  >;

  return (
    <div>
      <PageHeader
        title="Quotes"
        description="Every estimate you've drafted, in one pipeline."
        action={<Link href="/quotes/new" className="btn-primary">New quote</Link>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip href="/quotes" active={!statusFilter}>All</FilterChip>
        {QUOTE_STATUSES.map((s) => (
          <FilterChip key={s} href={`/quotes?status=${s}`} active={statusFilter === s}>
            {QUOTE_STATUS_LABELS[s]}
          </FilterChip>
        ))}
      </div>

      {quotes.length === 0 ? (
        <EmptyState
          title={statusFilter ? `No ${QUOTE_STATUS_LABELS[statusFilter].toLowerCase()} quotes` : "No quotes yet"}
          description="Generate a draft from job notes — it takes about two minutes."
          cta={{ label: "Create a quote", href: "/quotes/new" }}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Quote</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Valid until</th>
                <th className="px-4 py-3 text-right font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/quotes/${q.id}`} className="font-medium text-brand-700 hover:underline">
                      {q.quote_number || "Draft"}
                    </Link>
                    <div className="text-xs text-gray-500">{q.title || "Untitled"}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{q.customer?.name || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(Number(q.total || 0), currency)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatDate(q.valid_until)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{formatDate(q.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm font-medium",
        active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"
      )}
    >
      {children}
    </Link>
  );
}
