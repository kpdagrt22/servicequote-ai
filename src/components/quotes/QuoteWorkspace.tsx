"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Quote, QuoteLineItem, Customer, PriceBookItem } from "@/lib/types/db";
import {
  getAllowedTransitions,
  getQuoteStatusLabel,
  getTransitionActionLabel,
  isQuoteEditable,
  AI_ESTIMATE_DISCLAIMER,
  QUOTE_REVIEW_DISCLAIMER,
  type QuoteStatus,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { toNumber, round2 } from "@/lib/utils";
import { computeUnitPrice, computeLineTotal, computeQuoteTotals } from "@/lib/quotes/calculations";
import { StatusBadge } from "@/components/app/ui";
import { canShareQuote } from "@/lib/quotes/sharing";
import { saveQuoteDraft, updateQuoteStatus, recordQuoteEvent, duplicateQuote, sendQuote } from "@/lib/actions/quotes";

interface LineDraft {
  key: string;
  id?: string;
  price_book_item_id: string | null;
  category: string;
  name: string;
  description: string;
  unit: string;
  quantity: string;
  material_cost: string;
  labor_minutes: string;
  labor_rate: string;
  markup_percent: string;
  unit_price: string;
  priceOverridden: boolean;
  ai_generated: boolean;
  confidence: number | null;
}

let keySeq = 0;
const nextKey = () => `line-${keySeq++}`;

function fromLineItem(li: QuoteLineItem): LineDraft {
  return {
    key: nextKey(),
    id: li.id,
    price_book_item_id: li.price_book_item_id,
    category: li.category ?? "",
    name: li.name,
    description: li.description ?? "",
    unit: li.unit ?? "each",
    quantity: String(li.quantity ?? 1),
    material_cost: String(li.material_cost ?? 0),
    labor_minutes: String(li.labor_minutes ?? 0),
    labor_rate: String(li.labor_rate ?? 0),
    markup_percent: String(li.markup_percent ?? 0),
    unit_price: String(li.unit_price ?? 0),
    priceOverridden: true, // existing prices are respected until components are touched
    ai_generated: li.ai_generated,
    confidence: li.confidence,
  };
}

function blankLine(laborRate: number): LineDraft {
  return {
    key: nextKey(),
    price_book_item_id: null,
    category: "",
    name: "",
    description: "",
    unit: "each",
    quantity: "1",
    material_cost: "0",
    labor_minutes: "0",
    labor_rate: String(laborRate),
    markup_percent: "0",
    unit_price: "0",
    priceOverridden: false,
    ai_generated: false,
    confidence: null,
  };
}

function lineComponents(l: LineDraft) {
  return {
    quantity: toNumber(l.quantity),
    materialCost: toNumber(l.material_cost),
    laborMinutes: toNumber(l.labor_minutes),
    laborRate: toNumber(l.labor_rate),
    markupPercent: toNumber(l.markup_percent),
  };
}

export function QuoteWorkspace({
  quote,
  customer,
  initialLineItems,
  priceBook,
  org,
  aiInsights,
  canEdit,
}: {
  quote: Quote & { customer?: Customer | null };
  customer: Customer | null;
  initialLineItems: QuoteLineItem[];
  priceBook: PriceBookItem[];
  org: { name: string; currency: string; defaultLaborRate: number; logoUrl: string | null };
  aiInsights: {
    confidence?: number;
    used_fallback?: boolean;
    risk_flags?: string[];
    questions?: string[];
    cannot_price_items?: string[];
    missing_information?: string[];
  } | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<QuoteStatus>(quote.status);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(quote.share_token ?? null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sendNote, setSendNote] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Build the absolute share URL on the client to avoid SSR/runtime URL drift.
  useEffect(() => {
    if (shareToken && typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/p/${shareToken}`);
    }
  }, [shareToken]);

  const editable = canEdit && isQuoteEditable(status);

  const [title, setTitle] = useState(quote.title ?? "");
  const [scope, setScope] = useState(quote.scope_summary ?? "");
  const [assumptions, setAssumptions] = useState(quote.assumptions ?? "");
  const [exclusions, setExclusions] = useState(quote.exclusions ?? "");
  const [validUntil, setValidUntil] = useState(quote.valid_until ?? "");
  const [taxPercent, setTaxPercent] = useState(String(quote.tax_percent ?? 0));
  const [lines, setLines] = useState<LineDraft[]>(() => initialLineItems.map(fromLineItem));
  const [pbSelect, setPbSelect] = useState("");

  const totals = useMemo(() => {
    // round2 the unit price first — exactly what saveQuoteDraft does server-side —
    // so the live preview total always matches the persisted total.
    const lineTotals = lines.map((l) =>
      computeLineTotal(round2(toNumber(l.unit_price)), toNumber(l.quantity))
    );
    return computeQuoteTotals({ lineTotals, taxPercent: toNumber(taxPercent) });
  }, [lines, taxPercent]);

  function markDirty() {
    setSaved(false);
  }

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const updated = { ...l, ...patch };
        // Recompute price from components unless the user has overridden it.
        const touchedComponents = ["quantity", "material_cost", "labor_minutes", "labor_rate", "markup_percent"].some(
          (f) => f in patch
        );
        if (touchedComponents && !updated.priceOverridden) {
          updated.unit_price = String(computeUnitPrice(lineComponents(updated)));
        }
        return updated;
      })
    );
    markDirty();
  }

  function overrideUnitPrice(key: string, value: string) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, unit_price: value, priceOverridden: true } : l)));
    markDirty();
  }

  function resetLinePrice(key: string) {
    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? { ...l, priceOverridden: false, unit_price: String(computeUnitPrice(lineComponents(l))) }
          : l
      )
    );
    markDirty();
  }

  function addBlankLine() {
    setLines((prev) => [...prev, blankLine(org.defaultLaborRate)]);
    markDirty();
  }

  function addFromPriceBook(id: string) {
    const item = priceBook.find((p) => p.id === id);
    if (!item) return;
    const draft = blankLine(org.defaultLaborRate);
    draft.price_book_item_id = item.id;
    draft.category = item.category ?? "";
    draft.name = item.name;
    draft.description = item.description ?? "";
    draft.unit = item.unit ?? "each";
    draft.quantity = String(item.default_quantity ?? 1);
    draft.material_cost = String(item.material_cost ?? 0);
    draft.labor_minutes = String(item.labor_minutes ?? 0);
    draft.markup_percent = String(item.markup_percent ?? 0);
    if (item.price_override != null) {
      draft.unit_price = String(item.price_override);
      draft.priceOverridden = true;
    } else {
      draft.unit_price = String(computeUnitPrice(lineComponents(draft)));
    }
    setLines((prev) => [...prev, draft]);
    setPbSelect("");
    markDirty();
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
    markDirty();
  }

  function save() {
    setError(null);
    if (lines.some((l) => !l.name.trim())) {
      setError("Every line item needs a name.");
      return;
    }
    startTransition(async () => {
      const res = await saveQuoteDraft(quote.id, {
        title,
        scope_summary: scope,
        assumptions,
        exclusions,
        valid_until: validUntil,
        tax_percent: toNumber(taxPercent),
        line_items: lines.map((l) => ({
          id: l.id,
          price_book_item_id: l.price_book_item_id,
          category: l.category,
          name: l.name,
          description: l.description,
          quantity: toNumber(l.quantity),
          unit: l.unit,
          material_cost: toNumber(l.material_cost),
          labor_minutes: toNumber(l.labor_minutes),
          labor_rate: toNumber(l.labor_rate),
          markup_percent: toNumber(l.markup_percent),
          unit_price: toNumber(l.unit_price),
          ai_generated: l.ai_generated,
          confidence: l.confidence,
        })),
      });
      if (!res.ok) {
        setError(res.error ?? "Could not save.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function changeStatus(next: QuoteStatus) {
    setError(null);
    startTransition(async () => {
      const res = await updateQuoteStatus(quote.id, next);
      if (!res.ok) {
        setError(res.error ?? "Could not update status.");
        return;
      }
      setStatus(next);
      router.refresh();
    });
  }

  const customerMessage = `Hi ${customer?.name || "there"}, attached is the proposal for ${
    title || "your project"
  }. Please review the scope, pricing, assumptions, and exclusions. Let me know if you would like any changes. — ${org.name}`;

  function copyMessage() {
    navigator.clipboard?.writeText(customerMessage).then(() => {
      setCopied(true);
      recordQuoteEvent(quote.id, "customer_message_copied");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function openProposal() {
    recordQuoteEvent(quote.id, "proposal_generated");
    window.open(`/proposal/${quote.id}/print`, "_blank");
  }

  function duplicate() {
    setError(null);
    startTransition(async () => {
      const res = await duplicateQuote(quote.id);
      if (!res.ok || !res.quoteId) {
        setError(res.error ?? "Could not duplicate the quote.");
        return;
      }
      router.push(`/quotes/${res.quoteId}`);
      router.refresh();
    });
  }

  function send(withEmail: boolean) {
    setError(null);
    setSendNote(null);
    startTransition(async () => {
      const res = await sendQuote(quote.id, { email: withEmail });
      if (!res.ok) {
        setError(res.error ?? "Could not send the quote.");
        return;
      }
      if (status === "ready") setStatus("sent");
      if (res.shareUrl) {
        setShareUrl(res.shareUrl);
        const m = res.shareUrl.match(/\/p\/([^/?#]+)/);
        if (m) setShareToken(m[1]);
      }
      if (res.emailed) setSendNote("Emailed to the customer ✓");
      else if (res.emailNote) setSendNote(res.emailNote);
      else setSendNote("Share link ready — copy it below.");
      router.refresh();
    });
  }

  function copyShareLink() {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setLinkCopied(true);
      recordQuoteEvent(quote.id, "customer_message_copied");
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  const allowedTransitions = getAllowedTransitions(status);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Editor column */}
      <div className="space-y-6 lg:col-span-2">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-mono">{quote.quote_number || "Draft"}</span>
                <StatusBadge status={status} />
              </div>
              {editable ? (
                <input
                  className="input mt-2 text-lg font-semibold"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                  placeholder="Quote title"
                />
              ) : (
                <h1 className="mt-2 text-lg font-semibold text-gray-900">{title || "Untitled quote"}</h1>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <Labeled label="Scope of work">
              {editable ? (
                <textarea className="input min-h-[70px]" value={scope} onChange={(e) => { setScope(e.target.value); markDirty(); }} />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-line">{scope || "—"}</p>
              )}
            </Labeled>
          </div>
        </div>

        {editable && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {AI_ESTIMATE_DISCLAIMER}
          </div>
        )}

        {/* Line items */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Line items</h2>
            {editable && (
              <div className="flex items-center gap-2">
                {priceBook.length > 0 && (
                  <select
                    className="input h-9 w-44 text-sm"
                    value={pbSelect}
                    onChange={(e) => { setPbSelect(e.target.value); if (e.target.value) addFromPriceBook(e.target.value); }}
                  >
                    <option value="">+ From price book…</option>
                    {priceBook.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
                <button className="btn-secondary h-9 text-sm" onClick={addBlankLine}>+ Add line</button>
              </div>
            )}
          </div>

          {lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">No line items. Add one to build the quote.</p>
          ) : editable ? (
            <div className="space-y-3">
              {lines.map((l) => {
                const lineTotal = computeLineTotal(round2(toNumber(l.unit_price)), toNumber(l.quantity));
                const suggested = computeUnitPrice(lineComponents(l));
                return (
                  <div key={l.key} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start gap-2">
                      <input
                        className="input flex-1 font-medium"
                        value={l.name}
                        placeholder="Item name"
                        onChange={(e) => updateLine(l.key, { name: e.target.value })}
                      />
                      <button className="btn-ghost px-2 text-red-600" title="Remove" onClick={() => removeLine(l.key)}>✕</button>
                    </div>
                    <input
                      className="input mt-2 text-sm"
                      value={l.description}
                      placeholder="Description (optional)"
                      onChange={(e) => updateLine(l.key, { description: e.target.value })}
                    />
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-7">
                      <NumCol label="Qty" value={l.quantity} onChange={(v) => updateLine(l.key, { quantity: v })} />
                      <TextCol label="Unit" value={l.unit} onChange={(v) => updateLine(l.key, { unit: v })} />
                      <NumCol label="Material" value={l.material_cost} onChange={(v) => updateLine(l.key, { material_cost: v })} />
                      <NumCol label="Labor min" value={l.labor_minutes} onChange={(v) => updateLine(l.key, { labor_minutes: v })} />
                      <NumCol label="Rate/hr" value={l.labor_rate} onChange={(v) => updateLine(l.key, { labor_rate: v })} />
                      <NumCol label="Markup %" value={l.markup_percent} onChange={(v) => updateLine(l.key, { markup_percent: v })} />
                      <NumCol label="Unit price" value={l.unit_price} onChange={(v) => overrideUnitPrice(l.key, v)} highlight />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <div className="text-gray-400">
                        {l.priceOverridden ? (
                          <button className="text-brand-700 hover:underline" onClick={() => resetLinePrice(l.key)}>
                            ↻ Use calculated {formatCurrency(suggested, org.currency)}
                          </button>
                        ) : (
                          <span>Auto-priced from cost + markup</span>
                        )}
                        {l.confidence != null && (
                          <span className="ml-2">· AI confidence {Math.round(l.confidence * 100)}%</span>
                        )}
                      </div>
                      <div className="font-semibold text-gray-900">{formatCurrency(lineTotal, org.currency)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ReadOnlyLineItems lines={lines} currency={org.currency} />
          )}
        </div>

        {/* Assumptions / Exclusions / tax */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <Labeled label="Assumptions">
              {editable ? (
                <textarea className="input min-h-[90px]" value={assumptions} onChange={(e) => { setAssumptions(e.target.value); markDirty(); }} />
              ) : (
                <p className="whitespace-pre-line text-sm text-gray-700">{assumptions || "—"}</p>
              )}
            </Labeled>
          </div>
          <div className="card p-5">
            <Labeled label="Exclusions">
              {editable ? (
                <textarea className="input min-h-[90px]" value={exclusions} onChange={(e) => { setExclusions(e.target.value); markDirty(); }} />
              ) : (
                <p className="whitespace-pre-line text-sm text-gray-700">{exclusions || "—"}</p>
              )}
            </Labeled>
          </div>
        </div>
      </div>

      {/* Side column */}
      <div className="space-y-6">
        {/* Totals */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900">Totals</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Subtotal" value={formatCurrency(totals.subtotal, org.currency)} />
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-2 text-gray-500">
                Tax
                {editable ? (
                  <input
                    className="input h-7 w-16 text-right text-xs"
                    type="number"
                    step="0.01"
                    value={taxPercent}
                    onChange={(e) => { setTaxPercent(e.target.value); markDirty(); }}
                  />
                ) : (
                  <span>{Number(quote.tax_percent)}%</span>
                )}
                {editable && <span className="text-xs">%</span>}
              </dt>
              <dd className="font-medium text-gray-900">{formatCurrency(totals.taxAmount, org.currency)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-base">
              <dt className="font-semibold text-gray-900">Total</dt>
              <dd className="font-bold text-gray-900">{formatCurrency(totals.total, org.currency)}</dd>
            </div>
          </dl>

          {editable && (
            <div className="mt-4">
              <label className="label">Valid until</label>
              <input type="date" className="input" value={validUntil} onChange={(e) => { setValidUntil(e.target.value); markDirty(); }} />
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          {editable && (
            <button className="btn-primary mt-4 w-full justify-center" onClick={save} disabled={pending}>
              {pending ? "Saving…" : saved ? "Saved ✓" : "Save quote"}
            </button>
          )}
        </div>

        {/* Proposal actions */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900">Proposal</h2>
          <p className="mt-1 text-sm text-gray-500">Generate a branded PDF you can send to the customer.</p>
          <button className="btn-primary mt-3 w-full justify-center" onClick={openProposal}>
            {quote.pdf_url ? "Regenerate / Print PDF" : "Preview & download PDF"}
          </button>
          <p className="mt-2 text-xs text-gray-400">Opens a print-ready proposal. Use “Save as PDF” in the print dialog.</p>
        </div>

        {/* Send to customer */}
        {canEdit && (
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900">Send to customer</h2>
            {canShareQuote(status) ? (
              <>
                <p className="mt-1 text-sm text-gray-500">
                  Share a read-only proposal the customer can review and accept online.
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    className="btn-primary w-full justify-center"
                    onClick={() => send(Boolean(customer?.email))}
                    disabled={pending}
                  >
                    {pending
                      ? "Sending…"
                      : customer?.email
                        ? `Send & email ${customer.email}`
                        : "Send to customer"}
                  </button>
                  {shareUrl && (
                    <button className="btn-secondary w-full justify-center" onClick={copyShareLink}>
                      {linkCopied ? "Link copied ✓" : "Copy share link"}
                    </button>
                  )}
                </div>
                {shareUrl && (
                  <p className="mt-2 break-all rounded-lg bg-gray-50 p-2 text-xs text-gray-600">{shareUrl}</p>
                )}
                {sendNote && <p className="mt-2 text-xs text-brand-700">{sendNote}</p>}
              </>
            ) : (
              <p className="mt-1 text-sm text-gray-500">
                Mark the quote <strong>ready</strong> first, then you can send it to the customer.
              </p>
            )}
          </div>
        )}

        {/* Status */}
        {canEdit && (
          <div className="card p-5">
            <h2 className="text-base font-semibold text-gray-900">Status</h2>
            <p className="mt-1 text-sm text-gray-500">Currently <strong>{getQuoteStatusLabel(status)}</strong>.</p>
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{QUOTE_REVIEW_DISCLAIMER}</p>
            {allowedTransitions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {allowedTransitions.map((s) => (
                  <button
                    key={s}
                    className={s === "archived" ? "btn-ghost text-sm" : "btn-secondary text-sm"}
                    onClick={() => changeStatus(s)}
                    disabled={pending}
                  >
                    {getTransitionActionLabel(status, s)}
                  </button>
                ))}
              </div>
            )}
            <button className="btn-ghost mt-3 w-full justify-center text-sm" onClick={duplicate} disabled={pending}>
              Duplicate quote
            </button>
          </div>
        )}

        {/* Customer message */}
        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900">Customer message</h2>
          <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{customerMessage}</p>
          <button className="btn-secondary mt-3 w-full justify-center" onClick={copyMessage}>
            {copied ? "Copied ✓" : "Copy message"}
          </button>
        </div>

        {/* AI insights */}
        {aiInsights &&
          (aiInsights.risk_flags?.length ||
            aiInsights.questions?.length ||
            aiInsights.cannot_price_items?.length ||
            aiInsights.missing_information?.length ||
            typeof aiInsights.confidence === "number") && (
            <div className="card p-5">
              <h2 className="text-base font-semibold text-gray-900">AI insights</h2>
              {typeof aiInsights.confidence === "number" && (
                <p className="mt-1 text-sm text-gray-500">Draft confidence: {Math.round(aiInsights.confidence * 100)}%</p>
              )}
              {typeof aiInsights.confidence === "number" && aiInsights.confidence < 0.5 && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Low confidence — double-check the line items and prices carefully before sending.
                </p>
              )}
              {aiInsights.cannot_price_items && aiInsights.cannot_price_items.length > 0 && (
                <InsightList title="Couldn’t price — you set these" items={aiInsights.cannot_price_items} accent="amber" />
              )}
              {aiInsights.risk_flags && aiInsights.risk_flags.length > 0 && (
                <InsightList title="Check before sending" items={aiInsights.risk_flags} accent="amber" />
              )}
              {aiInsights.missing_information && aiInsights.missing_information.length > 0 && (
                <InsightList title="Missing information" items={aiInsights.missing_information} accent="gray" />
              )}
              {aiInsights.questions && aiInsights.questions.length > 0 && (
                <InsightList title="Questions for the customer" items={aiInsights.questions} accent="gray" />
              )}
            </div>
          )}
      </div>
    </div>
  );
}

function InsightList({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: "amber" | "gray";
}) {
  return (
    <div className="mt-3">
      <p className={`text-xs font-semibold uppercase tracking-wide ${accent === "amber" ? "text-amber-700" : "text-gray-500"}`}>
        {title}
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function ReadOnlyLineItems({ lines, currency }: { lines: LineDraft[]; currency: string }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="py-2 font-medium">Item</th>
          <th className="py-2 text-right font-medium">Qty</th>
          <th className="py-2 text-right font-medium">Unit price</th>
          <th className="py-2 text-right font-medium">Total</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {lines.map((l) => (
          <tr key={l.key}>
            <td className="py-2">
              <div className="font-medium text-gray-900">{l.name}</div>
              {l.description && <div className="text-xs text-gray-400">{l.description}</div>}
            </td>
            <td className="py-2 text-right text-gray-700">{toNumber(l.quantity)} {l.unit}</td>
            <td className="py-2 text-right text-gray-700">{formatCurrency(round2(toNumber(l.unit_price)), currency)}</td>
            <td className="py-2 text-right font-medium text-gray-900">
              {formatCurrency(computeLineTotal(round2(toNumber(l.unit_price)), toNumber(l.quantity)), currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label">{label}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function NumCol({ label, value, onChange, highlight }: { label: string; value: string; onChange: (v: string) => void; highlight?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <input
        type="number"
        step="0.01"
        className={`input h-9 text-sm ${highlight ? "border-brand-300 font-semibold" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function TextCol({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <input className="input h-9 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
