import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { stripeConfig } from "@/lib/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook (placeholder-but-functional).
 *
 * Verifies the signature with the webhook secret (no SDK needed) and upserts the
 * organization's subscription row using the service-role client. If billing
 * isn't configured it simply acknowledges so local development never breaks.
 *
 * Configure the endpoint in Stripe to POST here and set STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!stripeConfig.isConfigured || !stripeConfig.webhookSecret) {
    // Acknowledge but do nothing — billing not configured.
    return NextResponse.json({ received: true, configured: false });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature || !verifyStripeSignature(rawBody, signature, stripeConfig.webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const obj = event.data?.object ?? {};

  try {
    if (admin && event.type === "checkout.session.completed") {
      const orgId = (obj.client_reference_id as string | null) ?? null;
      if (orgId) {
        await admin.from("subscriptions").upsert(
          {
            organization_id: orgId,
            stripe_customer_id: (obj.customer as string | null) ?? null,
            stripe_subscription_id: (obj.subscription as string | null) ?? null,
            status: "active",
          },
          { onConflict: "organization_id" }
        );
      }
    } else if (
      admin &&
      (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted")
    ) {
      const subId = obj.id as string | undefined;
      if (subId) {
        await admin
          .from("subscriptions")
          .update({
            status: (obj.status as string | null) ?? null,
            current_period_end: obj.current_period_end
              ? new Date(Number(obj.current_period_end) * 1000).toISOString()
              : null,
          })
          .eq("stripe_subscription_id", subId);
      }
    }
  } catch (err) {
    // Don't 500 — Stripe will retry. Log for debugging.
    console.error("Stripe webhook handler error:", err);
  }

  return NextResponse.json({ received: true });
}

/** Verify a Stripe signature header: `t=timestamp,v1=hexhmac`. */
function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k, v];
    })
  );
  const timestamp = parts["t"];
  const expected = parts["v1"];
  if (!timestamp || !expected) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const computed = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expected));
  } catch {
    return false;
  }
}
