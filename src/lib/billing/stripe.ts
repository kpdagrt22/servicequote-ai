import { stripeConfig, appUrl } from "@/lib/config";
import type { PlanId } from "@/lib/constants";

/**
 * Thin Stripe abstraction using the REST API via fetch (no SDK dependency).
 *
 * Everything degrades gracefully: when STRIPE_SECRET_KEY is absent, callers can
 * detect `isBillingConfigured()` and show "Billing not configured" instead of
 * failing. Swap to the official Stripe SDK when you harden billing.
 */

export function isBillingConfigured(): boolean {
  return stripeConfig.isConfigured;
}

export function priceIdForPlan(plan: PlanId | "setup"): string {
  switch (plan) {
    case "starter":
      return stripeConfig.prices.starter;
    case "pro":
      return stripeConfig.prices.pro;
    case "team":
      return stripeConfig.prices.team;
    case "setup":
      return stripeConfig.prices.setup;
    default:
      return "";
  }
}

interface CheckoutParams {
  plan: PlanId | "setup";
  email?: string | null;
  organizationId?: string | null;
}

export interface CheckoutResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/** Create a Stripe Checkout session and return its hosted URL. */
export async function createCheckoutSession({ plan, email, organizationId }: CheckoutParams): Promise<CheckoutResult> {
  if (!isBillingConfigured()) {
    return { ok: false, error: "Billing not configured." };
  }
  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    return { ok: false, error: `No Stripe price configured for the "${plan}" plan.` };
  }

  const isSetup = plan === "setup";
  const form = new URLSearchParams();
  form.set("mode", isSetup ? "payment" : "subscription");
  form.set("line_items[0][price]", priceId);
  form.set("line_items[0][quantity]", "1");
  form.set("success_url", `${appUrl}/dashboard?checkout=success`);
  form.set("cancel_url", `${appUrl}/pricing?checkout=cancelled`);
  form.set("allow_promotion_codes", "true");
  if (email) form.set("customer_email", email);
  if (organizationId) form.set("client_reference_id", organizationId);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeConfig.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `Stripe error: ${res.status} ${text}` };
  }
  const json = (await res.json()) as { url?: string };
  if (!json.url) return { ok: false, error: "Stripe did not return a checkout URL." };
  return { ok: true, url: json.url };
}
