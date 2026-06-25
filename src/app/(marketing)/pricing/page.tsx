import type { Metadata } from "next";
import Link from "next/link";
import { PLANS, SETUP_SERVICE, PRICING_NOT_GUARANTEED } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { stripeConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Pricing that pays for one extra job a month.
        </h1>
        <p className="mt-4 text-gray-600">
          Every plan includes unlimited editable quotes and branded proposals. No accounting setup required.
        </p>
      </div>

      {!stripeConfig.isConfigured && (
        <div className="mx-auto mt-8 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Billing not configured.</strong> Stripe keys aren&apos;t set, so checkout runs in
          preview mode. You can still create your account and use the app — see{" "}
          <code className="rounded bg-amber-100 px-1">docs/DEPLOYMENT.md</code>.
        </div>
      )}

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`card flex flex-col p-8 ${plan.highlighted ? "ring-2 ring-brand-500" : ""}`}
          >
            {plan.highlighted && (
              <span className="badge mb-2 self-start bg-brand-100 text-brand-700">Most popular</span>
            )}
            <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
            <p className="mt-1 text-sm text-gray-600">{plan.blurb}</p>
            <p className="mt-6 text-4xl font-extrabold text-gray-900">
              {formatCurrency(plan.price)}
              <span className="text-base font-medium text-gray-500">/mo</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-700">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 flex-none text-brand-600" aria-hidden>
                    <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
                  </svg>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={`/signup?plan=${plan.id}`}
              className={`mt-8 ${plan.highlighted ? "btn-primary" : "btn-secondary"} w-full justify-center py-3`}
            >
              Start with {plan.name}
            </Link>
          </div>
        ))}
      </div>

      {/* Setup service */}
      <div className="mx-auto mt-10 max-w-5xl">
        <div className="card flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{SETUP_SERVICE.name}</h3>
            <p className="mt-1 max-w-xl text-sm text-gray-600">{SETUP_SERVICE.blurb}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(SETUP_SERVICE.price)}
              <span className="text-sm font-medium text-gray-500"> one-time</span>
            </span>
            <a href="mailto:hello@example.com?subject=Setup%20service" className="btn-primary">
              Request setup
            </a>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-3xl text-center text-xs text-gray-500">{PRICING_NOT_GUARANTEED}</p>
    </div>
  );
}
