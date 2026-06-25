import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/org";
import { PrintToolbar } from "@/components/proposal/PrintToolbar";
import { formatCurrency, formatDate } from "@/lib/format";
import { buildProposalView } from "@/lib/quotes/proposal";
import { PRICING_NOT_GUARANTEED } from "@/lib/constants";
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
  const currency = view.currency;

  return (
    <div className="min-h-screen bg-gray-100">
      <PrintToolbar backHref={`/quotes/${quote.id}`} />

      <div className="mx-auto my-6 max-w-3xl">
        <article className="print-page mx-auto bg-white p-10 shadow-sm">
          {/* Header */}
          <header className="flex items-start justify-between border-b border-gray-200 pb-6">
            <div className="flex items-center gap-4">
              {view.business.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={view.business.logoUrl} alt={`${view.business.name} logo`} className="h-16 w-16 rounded-lg object-contain" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-600 text-2xl font-bold text-white">
                  {view.business.name.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{view.business.name}</h1>
                <div className="mt-1 text-xs text-gray-500">
                  {view.business.contactLines.map((line, i) => <div key={i}>{line}</div>)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tracking-tight text-gray-900">QUOTE</p>
              <p className="mt-1 font-mono text-sm text-gray-600">{view.quoteNumber}</p>
              <p className="mt-2 text-xs text-gray-500">Date: {formatDate(view.quoteDate)}</p>
              {view.validUntil && <p className="text-xs text-gray-500">Valid until: {formatDate(view.validUntil)}</p>}
            </div>
          </header>

          {/* Customer + project */}
          <section className="mt-6 flex justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Prepared for</p>
              {view.customer ? (
                <div className="mt-1 text-sm text-gray-800">
                  <p className="font-semibold">{view.customer.name}</p>
                  {view.customer.addressLines.map((line, i) => <p key={i}>{line}</p>)}
                  {view.customer.email && <p>{view.customer.email}</p>}
                  {view.customer.phone && <p>{view.customer.phone}</p>}
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-500">—</p>
              )}
            </div>
            <div className="max-w-xs text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Project</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{view.title}</p>
              {view.jobLocation && (
                <p className="mt-1 text-xs text-gray-500">Job location: {view.jobLocation}</p>
              )}
            </div>
          </section>

          {/* Scope */}
          {view.scopeSummary && (
            <section className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Scope of work</p>
              <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{view.scopeSummary}</p>
            </section>
          )}

          {/* Line items */}
          <section className="mt-6">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[46%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="border-y border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Unit</th>
                  <th className="py-2 text-right font-medium">Unit price</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 align-top">
                {view.lineItems.map((li, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3">
                      <div className="font-medium text-gray-900 break-words">{li.name}</div>
                      {li.description && <div className="text-xs text-gray-500 break-words">{li.description}</div>}
                    </td>
                    <td className="py-2 text-right text-gray-700">{li.quantity}</td>
                    <td className="py-2 text-right text-gray-700">{li.unit}</td>
                    <td className="py-2 text-right text-gray-700">{formatCurrency(li.unitPrice, currency)}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(li.total, currency)}</td>
                  </tr>
                ))}
                {view.lineItems.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-gray-400">No line items.</td></tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <dl className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Subtotal</dt>
                  <dd className="text-gray-900">{formatCurrency(view.subtotal, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Tax ({view.taxPercent}%)</dt>
                  <dd className="text-gray-900">{formatCurrency(view.taxAmount, currency)}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-1 text-base font-bold">
                  <dt>Total</dt>
                  <dd>{formatCurrency(view.total, currency)}</dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Assumptions / Exclusions */}
          {(view.assumptions || view.exclusions) && (
            <section className="mt-8 grid grid-cols-2 gap-6 text-sm">
              {view.assumptions && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Assumptions</p>
                  <p className="mt-1 whitespace-pre-line text-gray-700">{view.assumptions}</p>
                </div>
              )}
              {view.exclusions && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Exclusions</p>
                  <p className="mt-1 whitespace-pre-line text-gray-700">{view.exclusions}</p>
                </div>
              )}
            </section>
          )}

          {/* Acceptance / signature */}
          <section className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Acceptance</p>
            <p className="mt-1 text-sm text-gray-600">
              By signing below, you approve the scope and pricing in this proposal.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
              <div>
                <div className="h-10 border-b border-gray-400" />
                <p className="mt-1 text-xs text-gray-500">Customer signature</p>
              </div>
              <div>
                <div className="h-10 border-b border-gray-400" />
                <p className="mt-1 text-xs text-gray-500">Date</p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-10 border-t border-gray-200 pt-6 text-xs text-gray-500">
            <p className="text-gray-600">{view.disclaimer}</p>
            <p className="mt-3 whitespace-pre-line text-gray-600">{view.footer}</p>
            {view.business.licenseText && <p className="mt-2">{view.business.licenseText}</p>}
            {view.business.googleReviewUrl && (
              <p className="mt-2">
                Happy with our work? Leave a review:{" "}
                <span className="text-gray-700">{view.business.googleReviewUrl}</span>
              </p>
            )}
            <p className="mt-4 text-[10px] text-gray-400">{PRICING_NOT_GUARANTEED}</p>
          </footer>
        </article>
      </div>
    </div>
  );
}
