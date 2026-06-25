import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { PrintToolbar } from "@/components/proposal/PrintToolbar";
import { formatCurrency, formatDate } from "@/lib/format";
import { computeLineTotal } from "@/lib/quotes/calculations";
import { DEFAULT_PROPOSAL_FOOTER, PRICING_NOT_GUARANTEED } from "@/lib/constants";
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

  const { data: liData } = await supabase
    .from("quote_line_items")
    .select("*")
    .eq("quote_id", quote.id)
    .order("sort_order", { ascending: true });
  const lineItems = (liData ?? []) as QuoteLineItem[];

  const currency = quote.currency || organization.default_currency || "USD";
  const customer = quote.customer;

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintToolbar backHref={`/quotes/${quote.id}`} />

      <div className="mx-auto my-6 max-w-3xl">
        <article className="print-page mx-auto bg-white p-10 shadow-sm">
          {/* Header */}
          <header className="flex items-start justify-between border-b border-gray-200 pb-6">
            <div className="flex items-center gap-4">
              {organization.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={organization.logo_url} alt={`${organization.name} logo`} className="h-16 w-16 rounded-lg object-contain" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-600 text-2xl font-bold text-white">
                  {organization.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{organization.name}</h1>
                <div className="mt-1 text-xs text-gray-500">
                  {[organization.address, [organization.city, organization.state].filter(Boolean).join(", ")]
                    .filter(Boolean)
                    .map((line, i) => <div key={i}>{line}</div>)}
                  {organization.phone && <div>{organization.phone}</div>}
                  {organization.website && <div>{organization.website}</div>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tracking-tight text-gray-900">QUOTE</p>
              <p className="mt-1 font-mono text-sm text-gray-600">{quote.quote_number || "Draft"}</p>
              <p className="mt-2 text-xs text-gray-500">Date: {formatDate(quote.created_at)}</p>
              {quote.valid_until && <p className="text-xs text-gray-500">Valid until: {formatDate(quote.valid_until)}</p>}
            </div>
          </header>

          {/* Customer + title */}
          <section className="mt-6 flex justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Prepared for</p>
              {customer ? (
                <div className="mt-1 text-sm text-gray-800">
                  <p className="font-semibold">{customer.name}</p>
                  {customer.address && <p>{customer.address}</p>}
                  {(customer.city || customer.state || customer.postal_code) && (
                    <p>{[customer.city, customer.state].filter(Boolean).join(", ")} {customer.postal_code}</p>
                  )}
                  {customer.email && <p>{customer.email}</p>}
                  {customer.phone && <p>{customer.phone}</p>}
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-500">—</p>
              )}
            </div>
            <div className="max-w-xs text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Project</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{quote.title || "Service quote"}</p>
            </div>
          </section>

          {/* Scope */}
          {quote.scope_summary && (
            <section className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Scope of work</p>
              <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{quote.scope_summary}</p>
            </section>
          )}

          {/* Line items */}
          <section className="mt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Unit price</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((li) => (
                  <tr key={li.id}>
                    <td className="py-2 pr-3">
                      <div className="font-medium text-gray-900">{li.name}</div>
                      {li.description && <div className="text-xs text-gray-500">{li.description}</div>}
                    </td>
                    <td className="py-2 text-right text-gray-700">{Number(li.quantity)} {li.unit}</td>
                    <td className="py-2 text-right text-gray-700">{formatCurrency(Number(li.unit_price), currency)}</td>
                    <td className="py-2 text-right font-medium text-gray-900">
                      {formatCurrency(computeLineTotal(Number(li.unit_price), Number(li.quantity)), currency)}
                    </td>
                  </tr>
                ))}
                {lineItems.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-400">No line items.</td></tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <dl className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Subtotal</dt>
                  <dd className="text-gray-900">{formatCurrency(Number(quote.subtotal), currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Tax ({Number(quote.tax_percent)}%)</dt>
                  <dd className="text-gray-900">{formatCurrency(Number(quote.tax_amount), currency)}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-1 text-base font-bold">
                  <dt>Total</dt>
                  <dd>{formatCurrency(Number(quote.total), currency)}</dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Assumptions / Exclusions */}
          {(quote.assumptions || quote.exclusions) && (
            <section className="mt-8 grid grid-cols-2 gap-6 text-sm">
              {quote.assumptions && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Assumptions</p>
                  <p className="mt-1 whitespace-pre-line text-gray-700">{quote.assumptions}</p>
                </div>
              )}
              {quote.exclusions && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Exclusions</p>
                  <p className="mt-1 whitespace-pre-line text-gray-700">{quote.exclusions}</p>
                </div>
              )}
            </section>
          )}

          {/* Footer */}
          <footer className="mt-10 border-t border-gray-200 pt-6 text-xs text-gray-500">
            <p className="whitespace-pre-line text-gray-600">
              {organization.proposal_footer || DEFAULT_PROPOSAL_FOOTER}
            </p>
            {organization.license_text && <p className="mt-2">{organization.license_text}</p>}
            {organization.google_review_url && (
              <p className="mt-2">
                Happy with our work? Leave a review:{" "}
                <span className="text-gray-700">{organization.google_review_url}</span>
              </p>
            )}
            <p className="mt-4 text-[10px] text-gray-400">{PRICING_NOT_GUARANTEED}</p>
          </footer>
        </article>
      </div>
    </div>
  );
}
