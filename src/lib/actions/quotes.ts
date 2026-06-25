"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type OrgContext } from "@/lib/org";
import {
  requireOrganizationMember,
  requireOrganizationEditor,
  assertCustomerBelongsToOrg,
  assertQuoteBelongsToOrg,
} from "@/lib/auth/organizations";
import { extractQuote } from "@/lib/ai/service";
import type { Customer, PriceBookItem } from "@/lib/types/db";
import type { PriceBookRef } from "@/lib/ai/schemas/quote-extraction";
import { lineItemFromSuggestion, listToText } from "@/lib/quotes/build";
import { computeQuoteTotals, computeLineTotal } from "@/lib/quotes/calculations";
import { round2 } from "@/lib/utils";
import { addDaysIso, formatCurrency } from "@/lib/format";
import {
  generateQuoteSchema,
  quoteSaveSchema,
  quoteStatusSchema,
} from "@/lib/validation/quote";
import { canTransitionQuoteStatus, isQuoteEditable, type QuoteStatus } from "@/lib/constants";
import { trackEvent } from "@/lib/observability/events";
import { getSubscription } from "@/lib/billing/subscription";
import { canCreateQuote, isPaid } from "@/lib/billing/entitlements";
import { checkDailyAiQuota, startOfUtcDayIso } from "@/lib/ai/quota";
import { canShareQuote, buildShareUrl } from "@/lib/quotes/sharing";
import { sendEmail, isEmailConfigured } from "@/lib/email/resend";
import { buildProposalEmail } from "@/lib/email/proposal-email";
import { appUrl } from "@/lib/config";

export interface QuoteActionResult {
  ok: boolean;
  error?: string;
  quoteId?: string;
  /** Set by sendQuote: the public proposal link the contractor can share. */
  shareUrl?: string;
  /** Set by sendQuote: whether a customer email was actually sent. */
  emailed?: boolean;
  /** Set by sendQuote when an email was requested but not sent. */
  emailNote?: string;
}

async function ensureEditor(): Promise<OrgContext> {
  return requireOrganizationEditor();
}

/** Count an org's non-archived quotes (used for the free-tier cap). */
async function countActiveQuotes(supabase: SupabaseClient, organizationId: string): Promise<number> {
  const { count } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .neq("status", "archived");
  return count ?? 0;
}

/** Count an org's AI generations since UTC midnight (used for the daily quota). */
async function countTodaysAiRuns(supabase: SupabaseClient, organizationId: string): Promise<number> {
  const since = startOfUtcDayIso(new Date());
  const { count } = await supabase
    .from("ai_extraction_logs")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("created_at", since);
  return count ?? 0;
}

/**
 * Step 1-3 of the quote flow: take customer + job notes, run AI extraction, and
 * persist a DRAFT quote with line items the contractor can then edit.
 */
export async function generateDraftQuote(input: unknown): Promise<QuoteActionResult> {
  const parsed = generateQuoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };
  const v = parsed.data;
  const { supabase, organization } = await ensureEditor();

  // Entitlement: cap quote count on the free tier.
  const subscription = await getSubscription(supabase, organization.id);
  const quoteCount = await countActiveQuotes(supabase, organization.id);
  const entitlement = canCreateQuote(subscription, quoteCount);
  if (!entitlement.allowed) {
    return { ok: false, error: entitlement.reason ?? "Quote limit reached." };
  }

  // Abuse guard: cap AI generations per org per day (protects real provider cost).
  const aiUsedToday = await countTodaysAiRuns(supabase, organization.id);
  const quota = checkDailyAiQuota(aiUsedToday, isPaid(subscription));
  if (!quota.allowed) {
    return { ok: false, error: quota.reason ?? "Daily AI limit reached." };
  }

  // Resolve / create the customer.
  let customerId = v.customerId ?? null;
  // Defense in depth: a provided customer id must belong to THIS org, so a quote
  // can never reference another organization's customer (RLS blocks reads, but
  // the FK would otherwise still accept a foreign id).
  if (customerId && !(await assertCustomerBelongsToOrg(supabase, customerId, organization.id))) {
    return { ok: false, error: "Customer not found." };
  }
  if (!customerId && v.newCustomer?.name) {
    const { data: cust, error: custErr } = await supabase
      .from("customers")
      .insert({
        organization_id: organization.id,
        name: v.newCustomer.name,
        email: v.newCustomer.email || null,
        phone: v.newCustomer.phone || null,
        address: v.newCustomer.address || null,
        city: v.newCustomer.city || null,
        state: v.newCustomer.state || null,
        postal_code: v.newCustomer.postal_code || null,
      })
      .select("id")
      .single();
    if (custErr) return { ok: false, error: custErr.message };
    customerId = cust.id as string;
  }

  // Load active price book for matching + line building.
  const { data: pbData } = await supabase
    .from("price_book_items")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("active", true);
  const priceBook = (pbData ?? []) as PriceBookItem[];
  const priceBookById = new Map(priceBook.map((p) => [p.id, p]));
  const priceBookRefs: PriceBookRef[] = priceBook.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    unit: p.unit,
    material_cost: p.material_cost,
    labor_minutes: p.labor_minutes,
  }));

  // Create the quote_request record.
  const { data: reqRow, error: reqErr } = await supabase
    .from("quote_requests")
    .insert({
      organization_id: organization.id,
      customer_id: customerId,
      raw_input: v.jobDescription,
      job_location: v.jobLocation || null,
      ai_status: "processing",
    })
    .select("id")
    .single();
  if (reqErr) return { ok: false, error: reqErr.message };
  const quoteRequestId = reqRow.id as string;

  // Run AI extraction (mock or real, with fallback).
  const result = await extractQuote({
    context: {
      businessName: organization.name,
      trade: organization.trade,
      defaultLaborRate: organization.default_labor_rate,
      defaultMarkupPercent: organization.default_material_markup_percent,
    },
    jobDescription: v.jobDescription,
    jobLocation: v.jobLocation || null,
    priceBook: priceBookRefs,
  });
  const extraction = result.extraction;

  // Log the extraction + update the request status.
  await supabase.from("ai_extraction_logs").insert({
    organization_id: organization.id,
    quote_request_id: quoteRequestId,
    provider: result.provider,
    model: result.model,
    input_text: v.jobDescription,
    output_json: extraction,
    status: result.ok ? "completed" : "fallback",
    error_message: result.error,
  });
  await supabase
    .from("quote_requests")
    .update({
      ai_status: "completed",
      ai_confidence: extraction.confidence,
      ai_notes: result.usedFallback ? `Fell back to mock: ${result.error}` : null,
    })
    .eq("id", quoteRequestId);

  // Build line items.
  const defaults = {
    laborRate: Number(organization.default_labor_rate ?? 0),
    markupPercent: Number(organization.default_material_markup_percent ?? 0),
  };
  const lineItems = extraction.suggested_line_items.map((s, idx) =>
    lineItemFromSuggestion(
      s,
      s.matched_price_book_item_id ? priceBookById.get(s.matched_price_book_item_id) : undefined,
      defaults,
      idx
    )
  );

  const taxPercent = Number(organization.default_tax_percent ?? 0);
  const totals = computeQuoteTotals({
    lineTotals: lineItems.map((l) => l.total_price),
    taxPercent,
  });

  // Allocate a quote number.
  const { data: numData } = await supabase.rpc("next_quote_number", { org: organization.id });
  const quoteNumber = (numData as string | null) ?? null;

  // Create the quote.
  const { data: quoteRow, error: quoteErr } = await supabase
    .from("quotes")
    .insert({
      organization_id: organization.id,
      customer_id: customerId,
      quote_request_id: quoteRequestId,
      quote_number: quoteNumber,
      title: extraction.job_type,
      scope_summary: extraction.scope_summary,
      assumptions: listToText(extraction.assumptions),
      exclusions: listToText(extraction.exclusions),
      status: "draft",
      subtotal: totals.subtotal,
      tax_percent: taxPercent,
      tax_amount: totals.taxAmount,
      total: totals.total,
      currency: organization.default_currency || "USD",
      valid_until: addDaysIso(30),
    })
    .select("id")
    .single();
  if (quoteErr) return { ok: false, error: quoteErr.message };
  const quoteId = quoteRow.id as string;

  if (lineItems.length > 0) {
    const { error: liErr } = await supabase
      .from("quote_line_items")
      .insert(lineItems.map((l) => ({ ...l, quote_id: quoteId })));
    if (liErr) return { ok: false, error: liErr.message };
  }

  await supabase.from("quote_events").insert([
    {
      organization_id: organization.id,
      quote_id: quoteId,
      event_type: "created",
      metadata: { source: "ai_flow" },
    },
    {
      organization_id: organization.id,
      quote_id: quoteId,
      event_type: "ai_generated",
      metadata: {
        provider: result.provider,
        confidence: extraction.confidence,
        used_fallback: result.usedFallback,
        risk_flags: extraction.risk_flags,
        questions: extraction.questions_for_contractor,
        cannot_price_items: extraction.cannot_price_items,
        missing_information: extraction.missing_information,
      },
    },
  ]);

  trackEvent("quote_created", { quote_id: quoteId, source: "ai_flow" });
  trackEvent("ai_quote_generated", {
    provider: result.provider,
    confidence: extraction.confidence,
    used_fallback: result.usedFallback,
  });

  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  return { ok: true, quoteId };
}

/**
 * Step 4: save the edited quote. Replaces line items and recomputes all totals
 * server-side so the database is always internally consistent, regardless of
 * what the client sent.
 */
export async function saveQuoteDraft(quoteId: string, input: unknown): Promise<QuoteActionResult> {
  const parsed = quoteSaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };
  const v = parsed.data;
  const { supabase, organization } = await ensureEditor();

  // Confirm the quote belongs to this org (defence in depth alongside RLS).
  const { data: existing } = await supabase
    .from("quotes")
    .select("id, status")
    .eq("id", quoteId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Quote not found." };

  // Enforce draft-only editing server-side — the client UI flag is not enough,
  // since this action can be called directly. Only drafts can have their line
  // items/content replaced; reopen a sent/accepted quote to draft first.
  if (!isQuoteEditable(existing.status as QuoteStatus)) {
    return { ok: false, error: "Only draft quotes can be edited. Reopen the quote to draft first." };
  }

  const rows = v.line_items.map((li, idx) => {
    const unitPrice = round2(li.unit_price);
    return {
      quote_id: quoteId,
      price_book_item_id: li.price_book_item_id ?? null,
      sort_order: idx,
      category: li.category,
      name: li.name,
      description: li.description,
      quantity: li.quantity,
      unit: li.unit,
      material_cost: li.material_cost,
      labor_minutes: li.labor_minutes,
      labor_rate: li.labor_rate,
      markup_percent: li.markup_percent,
      unit_price: unitPrice,
      total_price: computeLineTotal(unitPrice, li.quantity),
      ai_generated: li.ai_generated ?? false,
      confidence: li.confidence ?? null,
    };
  });

  const totals = computeQuoteTotals({
    lineTotals: rows.map((r) => r.total_price),
    taxPercent: v.tax_percent,
  });

  // Replace line items.
  const { error: delErr } = await supabase.from("quote_line_items").delete().eq("quote_id", quoteId);
  if (delErr) return { ok: false, error: delErr.message };
  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("quote_line_items").insert(rows);
    if (insErr) return { ok: false, error: insErr.message };
  }

  const { error: upErr } = await supabase
    .from("quotes")
    .update({
      title: v.title,
      scope_summary: v.scope_summary,
      assumptions: v.assumptions,
      exclusions: v.exclusions,
      valid_until: v.valid_until,
      tax_percent: v.tax_percent,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      total: totals.total,
    })
    .eq("id", quoteId)
    .eq("organization_id", organization.id);
  if (upErr) return { ok: false, error: upErr.message };

  await supabase.from("quote_events").insert({
    organization_id: organization.id,
    quote_id: quoteId,
    event_type: "edited",
    metadata: { line_item_count: rows.length, total: totals.total },
  });

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  return { ok: true, quoteId };
}

export async function updateQuoteStatus(quoteId: string, status: unknown): Promise<QuoteActionResult> {
  const parsedStatus = quoteStatusSchema.safeParse(status);
  if (!parsedStatus.success) return { ok: false, error: "Invalid status." };
  const next = parsedStatus.data as QuoteStatus;
  const { supabase, organization } = await ensureEditor();

  const { data: existing } = await supabase
    .from("quotes")
    .select("status")
    .eq("id", quoteId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Quote not found." };

  const current = existing.status as QuoteStatus;
  if (current !== next && !canTransitionQuoteStatus(current, next)) {
    return { ok: false, error: `Can't move a ${current} quote to ${next}.` };
  }

  const { error } = await supabase
    .from("quotes")
    .update({ status: next })
    .eq("id", quoteId)
    .eq("organization_id", organization.id);
  if (error) return { ok: false, error: error.message };

  await supabase.from("quote_events").insert({
    organization_id: organization.id,
    quote_id: quoteId,
    event_type: "status_changed",
    metadata: { from: current, to: next },
  });
  trackEvent("quote_status_changed", { quote_id: quoteId, from: current, to: next });

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  return { ok: true, quoteId };
}

export async function recordQuoteEvent(quoteId: string, eventType: string, metadata?: Record<string, unknown>) {
  const { supabase, organization } = await requireOrganizationMember();
  // Only record events for quotes that belong to this org, so an event row can
  // never pair our organization_id with another org's quote_id.
  if (!(await assertQuoteBelongsToOrg(supabase, quoteId, organization.id))) {
    return { ok: false, error: "Quote not found." };
  }

  await supabase.from("quote_events").insert({
    organization_id: organization.id,
    quote_id: quoteId,
    event_type: eventType,
    metadata: metadata ?? null,
  });
  return { ok: true };
}

/**
 * Duplicate an existing quote within the SAME organization. The copy starts as a
 * fresh DRAFT with a new quote number; all line items are copied; the customer
 * is kept (editable later). Useful when a contractor re-quotes a similar job.
 */
export async function duplicateQuote(quoteId: string): Promise<QuoteActionResult> {
  const { supabase, organization } = await ensureEditor();

  // Entitlement: duplicating creates a new quote, so it counts against the cap.
  const subscription = await getSubscription(supabase, organization.id);
  const quoteCount = await countActiveQuotes(supabase, organization.id);
  const entitlement = canCreateQuote(subscription, quoteCount);
  if (!entitlement.allowed) {
    return { ok: false, error: entitlement.reason ?? "Quote limit reached." };
  }

  // Load the source quote (org-scoped) and its line items.
  const { data: src } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!src) return { ok: false, error: "Quote not found." };

  const { data: srcLines } = await supabase
    .from("quote_line_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true });

  const { data: numData } = await supabase.rpc("next_quote_number", { org: organization.id });
  const quoteNumber = (numData as string | null) ?? null;

  const { data: copy, error: insErr } = await supabase
    .from("quotes")
    .insert({
      organization_id: organization.id,
      customer_id: src.customer_id,
      quote_request_id: null,
      quote_number: quoteNumber,
      title: src.title ? `${src.title} (copy)` : "Quote (copy)",
      scope_summary: src.scope_summary,
      assumptions: src.assumptions,
      exclusions: src.exclusions,
      status: "draft",
      subtotal: src.subtotal,
      tax_percent: src.tax_percent,
      tax_amount: src.tax_amount,
      total: src.total,
      currency: src.currency,
      valid_until: addDaysIso(30),
    })
    .select("id")
    .single();
  if (insErr) return { ok: false, error: insErr.message };
  const newId = copy.id as string;

  const lines = (srcLines ?? []) as Array<Record<string, unknown>>;
  if (lines.length > 0) {
    const rows = lines.map((l, idx) => ({
      quote_id: newId,
      price_book_item_id: l.price_book_item_id ?? null,
      sort_order: idx,
      category: l.category ?? null,
      name: l.name,
      description: l.description ?? null,
      quantity: l.quantity ?? 1,
      unit: l.unit ?? null,
      material_cost: l.material_cost ?? 0,
      labor_minutes: l.labor_minutes ?? 0,
      labor_rate: l.labor_rate ?? 0,
      markup_percent: l.markup_percent ?? 0,
      unit_price: l.unit_price ?? 0,
      total_price: l.total_price ?? 0,
      ai_generated: l.ai_generated ?? false,
      confidence: l.confidence ?? null,
    }));
    const { error: liErr } = await supabase.from("quote_line_items").insert(rows);
    if (liErr) return { ok: false, error: liErr.message };
  }

  await supabase.from("quote_events").insert({
    organization_id: organization.id,
    quote_id: newId,
    event_type: "quote_duplicated",
    metadata: { from_quote_id: quoteId, from_quote_number: src.quote_number ?? null },
  });

  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  return { ok: true, quoteId: newId };
}

/**
 * Send a quote to the customer: mint an unguessable share token (if absent),
 * move a `ready` quote to `sent`, and optionally email the customer a link to
 * the read-only branded proposal at /p/<token>. The contractor always gets the
 * shareable link back so they can send it themselves even without email set up.
 *
 * This is contractor-initiated (never automatic) and never finalises anything —
 * the customer accepts/declines on the public page.
 */
export async function sendQuote(
  quoteId: string,
  opts?: { email?: boolean }
): Promise<QuoteActionResult> {
  const { supabase, organization } = await ensureEditor();

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, status, share_token, customer_id, quote_number, title, total, currency")
    .eq("id", quoteId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!quote) return { ok: false, error: "Quote not found." };

  const status = quote.status as QuoteStatus;
  if (!canShareQuote(status)) {
    return { ok: false, error: "Mark the quote as ready before sending it to a customer." };
  }

  const token = (quote.share_token as string | null) ?? randomUUID();
  const nowIso = new Date().toISOString();

  // Promote ready -> sent (guarded). Leave sent/accepted/rejected as-is on re-send.
  const nextStatus: QuoteStatus =
    status === "ready" && canTransitionQuoteStatus(status, "sent") ? "sent" : status;

  const { error: upErr } = await supabase
    .from("quotes")
    .update({ share_token: token, shared_at: nowIso, status: nextStatus })
    .eq("id", quoteId)
    .eq("organization_id", organization.id);
  if (upErr) return { ok: false, error: upErr.message };

  await supabase.from("quote_events").insert({
    organization_id: organization.id,
    quote_id: quoteId,
    event_type: "quote_sent",
    metadata: { from: status, to: nextStatus },
  });
  trackEvent("quote_sent", { quote_id: quoteId, from: status, to: nextStatus });

  const shareUrl = buildShareUrl(appUrl, token);

  // Optional: email the customer the link.
  let emailed = false;
  let emailNote: string | undefined;
  if (opts?.email) {
    if (!isEmailConfigured()) {
      emailNote = "Email isn't configured — copy the link to send it yourself.";
    } else {
      const { data: customer } = await supabase
        .from("customers")
        .select("name, email")
        .eq("id", quote.customer_id as string)
        .eq("organization_id", organization.id)
        .maybeSingle();
      const cust = customer as Pick<Customer, "name" | "email"> | null;
      if (!cust?.email) {
        emailNote = "No customer email on file — copy the link to send it yourself.";
      } else {
        const built = buildProposalEmail({
          customerName: cust.name ?? null,
          businessName: organization.name,
          quoteTitle: (quote.title as string | null) ?? null,
          quoteNumber: (quote.quote_number as string | null) ?? null,
          totalFormatted: formatCurrency(Number(quote.total), quote.currency as string),
          shareUrl,
        });
        const result = await sendEmail({ to: cust.email, ...built });
        emailed = result.ok;
        if (!result.ok) emailNote = result.error ?? "Could not send the email.";
        await supabase.from("quote_events").insert({
          organization_id: organization.id,
          quote_id: quoteId,
          event_type: "quote_emailed",
          metadata: { ok: result.ok, error: result.error ?? null },
        });
        trackEvent("quote_emailed", { quote_id: quoteId, ok: result.ok });
      }
    }
  }

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  return { ok: true, quoteId, shareUrl, emailed, emailNote };
}

export async function deleteQuote(quoteId: string): Promise<QuoteActionResult> {
  const { supabase, organization } = await ensureEditor();
  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", quoteId)
    .eq("organization_id", organization.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/quotes");
  return { ok: true };
}
