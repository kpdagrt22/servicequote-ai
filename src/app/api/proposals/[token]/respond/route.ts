import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canTransitionQuoteStatus, type QuoteStatus } from "@/lib/constants";
import { canCustomerRespond } from "@/lib/quotes/sharing";

/**
 * Public endpoint for a customer to accept or decline a shared quote.
 *
 * Auth is the unguessable share token in the URL — there is no session. We use
 * the service-role client (server-side only) to look up the quote by token and,
 * ONLY when it is still awaiting the customer (`sent`), transition it to
 * accepted/rejected through the same guard the app uses. Idempotent-ish: a quote
 * that already responded returns 409 rather than flipping again.
 */
const bodySchema = z.object({ response: z.enum(["accepted", "declined"]) });

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Sharing is not configured." }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid response." }, { status: 400 });
  }

  const { data: quote } = await admin
    .from("quotes")
    .select("id, organization_id, status")
    .eq("share_token", params.token)
    .maybeSingle();
  if (!quote) {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  const status = quote.status as QuoteStatus;
  if (!canCustomerRespond(status)) {
    return NextResponse.json(
      { error: "This proposal can no longer be updated." },
      { status: 409 }
    );
  }

  const isAccept = parsed.data.response === "accepted";
  const nextStatus: QuoteStatus = isAccept ? "accepted" : "rejected";
  if (!canTransitionQuoteStatus(status, nextStatus)) {
    return NextResponse.json({ error: "This proposal can no longer be updated." }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const { error: upErr } = await admin
    .from("quotes")
    .update({
      status: nextStatus,
      customer_response: parsed.data.response,
      customer_responded_at: nowIso,
    })
    .eq("id", quote.id)
    .eq("status", status); // optimistic guard against a race
  if (upErr) {
    return NextResponse.json({ error: "Could not record your response." }, { status: 500 });
  }

  await admin.from("quote_events").insert({
    organization_id: quote.organization_id,
    quote_id: quote.id,
    event_type: isAccept ? "customer_accepted" : "customer_declined",
    metadata: { via: "public_link" },
  });

  return NextResponse.json({ ok: true, response: parsed.data.response });
}
