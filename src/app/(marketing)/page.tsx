import Link from "next/link";
import { PLANS, SETUP_SERVICE, TRADE_LABELS, PRICING_NOT_GUARANTEED } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

const USE_CASES = [
  {
    title: "Electrical repair",
    body: "Panel swap, GFCI outlets, a flickering circuit — turn the call notes into a clean estimate.",
  },
  {
    title: "HVAC installation",
    body: "Condenser, furnace, thermostat, ductwork — line-item the whole install in minutes.",
  },
  {
    title: "Service call",
    body: "Diagnostic plus parts and labor, priced from your own book, ready to text the customer.",
  },
  {
    title: "Small job estimate",
    body: "Drywall patch, a faucet swap, a mounted TV — quote the little jobs without the paperwork.",
  },
];

const FAQS = [
  {
    q: "Is pricing guaranteed?",
    a: "No. ServiceQuote AI is an editable quote assistant. It drafts line items from your notes and your price book, but you review and set every price before anything goes to a customer.",
  },
  {
    q: "Can I use my own prices?",
    a: "Yes — that's the point. Your price book is the accuracy layer. The AI prefers your items and prices; you stay in control of every number.",
  },
  {
    q: "Do I need to connect accounting software?",
    a: "No. There's no QuickBooks or Xero setup required. Describe the job, edit the quote, send the proposal.",
  },
  {
    q: "What trades do you support?",
    a: `We're starting with ${Object.values(TRADE_LABELS).join(", ")}. The first focus is electrical and HVAC.`,
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero ------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <div className="container-page py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="badge bg-brand-100 text-brand-700">For US service contractors</span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Create professional service quotes in minutes, not hours.
            </h1>
            <p className="mt-5 text-lg text-gray-600">
              Turn job notes into editable line-item estimates and branded proposals for your service business.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary px-6 py-3 text-base">Create Your First Quote</Link>
              <Link href="/signup?founding=1" className="btn-secondary px-6 py-3 text-base">Join Founding Contractors</Link>
            </div>
            <p className="mt-4 text-xs text-gray-500">No credit card to start · Works with mock AI out of the box</p>
          </div>
        </div>
      </section>

      {/* Problem ---------------------------------------------------------- */}
      <section className="container-page py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Slow quoting loses jobs.</h2>
          <p className="mt-4 text-gray-600">
            The contractor who quotes first usually wins. But writing up an estimate after a long day
            means quotes sit for days — and customers move on. Typing line items, looking up prices,
            and formatting a proposal eats the time you should spend on the tools.
          </p>
        </div>
      </section>

      {/* Solution / How it works ----------------------------------------- */}
      <section id="how" className="bg-gray-50 py-16">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">From job details to a branded proposal</h2>
            <p className="mt-3 text-gray-600">Four steps, a few minutes, you in control the whole way.</p>
          </div>
          <ol className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "1", t: "Job details", d: "Describe the job in plain English (or paste your notes)." },
              { n: "2", t: "AI draft", d: "Get a structured draft quote with line items from your price book." },
              { n: "3", t: "Editable quote", d: "Adjust quantities, costs, and prices. Totals recalculate live." },
              { n: "4", t: "Branded PDF", d: "Generate a professional proposal with your logo and terms." },
            ].map((s) => (
              <li key={s.n} className="card p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{s.t}</h3>
                <p className="mt-1 text-sm text-gray-600">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Use cases -------------------------------------------------------- */}
      <section id="use-cases" className="container-page py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Built for the jobs you actually quote</h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-6 sm:grid-cols-2">
          {USE_CASES.map((u) => (
            <div key={u.title} className="card p-6">
              <h3 className="font-semibold text-gray-900">{u.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser --------------------------------------------------- */}
      <section id="pricing" className="bg-gray-50 py-16">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Simple pricing</h2>
            <p className="mt-3 text-gray-600">Start fast. Upgrade when quoting becomes a habit.</p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`card p-6 ${plan.highlighted ? "ring-2 ring-brand-500" : ""}`}
              >
                {plan.highlighted && (
                  <span className="badge bg-brand-100 text-brand-700">Most popular</span>
                )}
                <h3 className="mt-2 text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-3xl font-extrabold text-gray-900">
                  {formatCurrency(plan.price)}
                  <span className="text-sm font-medium text-gray-500">/mo</span>
                </p>
                <p className="mt-2 text-sm text-gray-600">{plan.blurb}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-gray-600">
            Need help getting started?{" "}
            <span className="font-medium text-gray-900">
              {SETUP_SERVICE.name} — {formatCurrency(SETUP_SERVICE.price)} one-time.
            </span>{" "}
            <Link href="/pricing" className="font-medium text-brand-700 hover:underline">
              See full pricing →
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ -------------------------------------------------------------- */}
      <section id="faq" className="container-page py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">Frequently asked questions</h2>
          <dl className="mt-10 space-y-6">
            {FAQS.map((f) => (
              <div key={f.q} className="card p-6">
                <dt className="font-semibold text-gray-900">{f.q}</dt>
                <dd className="mt-2 text-sm text-gray-600">{f.a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 rounded-lg bg-gray-50 p-4 text-center text-xs text-gray-500">
            {PRICING_NOT_GUARANTEED}
          </p>
        </div>
      </section>

      {/* Final CTA -------------------------------------------------------- */}
      <section className="bg-brand-700">
        <div className="container-page py-16 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Win the next job with a faster quote.</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Set up your price book once, then quote in minutes — every time.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50">
              Create Your First Quote
            </Link>
            <Link href="/signup?founding=1" className="btn border border-brand-300 px-6 py-3 text-base text-white hover:bg-brand-600">
              Join Founding Contractors
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
