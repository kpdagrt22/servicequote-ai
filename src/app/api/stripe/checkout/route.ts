import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrg } from "@/lib/org";
import { createCheckoutSession, isBillingConfigured } from "@/lib/billing/stripe";
import { PLANS } from "@/lib/constants";

const bodySchema = z.object({
  plan: z.enum([...(PLANS.map((p) => p.id) as [string, ...string[]]), "setup"]),
});

/**
 * Create a Stripe Checkout session for the current organization.
 * POST /api/stripe/checkout  { plan: "starter" | "pro" | "team" | "setup" }
 */
export async function POST(request: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "Billing not configured." }, { status: 503 });
  }

  let ctx;
  try {
    ctx = await requireOrg();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const result = await createCheckoutSession({
    plan: parsed.data.plan as Parameters<typeof createCheckoutSession>[0]["plan"],
    email: ctx.email,
    organizationId: ctx.organization.id,
  });

  if (!result.ok || !result.url) {
    return NextResponse.json({ error: result.error ?? "Checkout failed." }, { status: 502 });
  }
  return NextResponse.json({ url: result.url });
}
