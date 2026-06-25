"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Customer } from "@/lib/types/db";
import { generateDraftQuote } from "@/lib/actions/quotes";

type CustomerLite = Pick<Customer, "id" | "name" | "email" | "phone" | "city" | "state">;

const SAMPLE =
  "Replace the main electrical panel with a new 200 amp service. Add two GFCI outlets in the kitchen and install a light fixture in the hallway. Customer mentioned the breaker trips often.";

export function NewQuoteWizard({
  customers,
  priceBookCount,
  aiProvider,
}: {
  customers: CustomerLite[];
  priceBookCount: number;
  aiProvider: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<"existing" | "new" | "none">(customers.length ? "existing" : "new");
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id ?? "");
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "", city: "", state: "" });
  const [jobDescription, setJobDescription] = useState("");
  const [jobLocation, setJobLocation] = useState("");

  function submit() {
    setError(null);
    if (mode === "new" && !newCustomer.name.trim()) {
      setError("Enter the new customer's name (or pick an existing customer).");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Describe the job so we can draft a quote.");
      return;
    }
    startTransition(async () => {
      const res = await generateDraftQuote({
        customerId: mode === "existing" ? customerId || null : null,
        newCustomer: mode === "new" ? newCustomer : null,
        jobDescription,
        jobLocation,
      });
      if (!res.ok || !res.quoteId) {
        setError(res.error ?? "Could not generate the quote.");
        return;
      }
      router.push(`/quotes/${res.quoteId}`);
    });
  }

  return (
    <div className="space-y-6">
      {pending && (
        <div className="card flex items-center gap-3 border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700" />
          Drafting your quote with {aiProvider === "mock" ? "the built-in assistant" : aiProvider}…
        </div>
      )}

      {priceBookCount === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your price book is empty, so prices below are rough estimates. For accurate quotes,{" "}
          <Link href="/price-book" className="font-medium underline">set up your price book</Link> first.
        </div>
      )}

      {/* Step 1: Customer */}
      <section className="card p-5">
        <div className="flex items-center gap-2">
          <Step n={1} /> <h2 className="text-base font-semibold text-gray-900">Customer</h2>
        </div>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {customers.length > 0 && (
              <ModeButton active={mode === "existing"} onClick={() => setMode("existing")}>Existing customer</ModeButton>
            )}
            <ModeButton active={mode === "new"} onClick={() => setMode("new")}>New customer</ModeButton>
            <ModeButton active={mode === "none"} onClick={() => setMode("none")}>No customer yet</ModeButton>
          </div>

          {mode === "existing" && customers.length > 0 && (
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.city ? ` — ${c.city}${c.state ? `, ${c.state}` : ""}` : ""}
                </option>
              ))}
            </select>
          )}

          {mode === "new" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" placeholder="Customer name *" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
              <input className="input" placeholder="Email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
              <input className="input" placeholder="Phone" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="City" value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} />
                <input className="input" placeholder="State" value={newCustomer.state} onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })} />
              </div>
            </div>
          )}

          {mode === "none" && <p className="text-sm text-gray-500">You can attach a customer later from the quote.</p>}
        </div>
      </section>

      {/* Step 2: Job details */}
      <section className="card p-5">
        <div className="flex items-center gap-2">
          <Step n={2} /> <h2 className="text-base font-semibold text-gray-900">Job details</h2>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="label">Describe the job</label>
              <button type="button" className="text-xs font-medium text-brand-700 hover:underline" onClick={() => setJobDescription(SAMPLE)}>
                Use a sample
              </button>
            </div>
            <textarea
              className="input min-h-[140px]"
              placeholder="e.g. Replace 40-gallon water heater, add a GFCI in the garage, customer reports low hot water pressure…"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-400">Plain English is fine. The more detail, the better the draft.</p>
          </div>
          <div>
            <label className="label">Job location (optional)</label>
            <input className="input" placeholder="123 Oak St, Austin TX" value={jobLocation} onChange={(e) => setJobLocation(e.target.value)} />
          </div>
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs text-gray-400">
            📷 Photo upload coming soon — for now, describe what you saw on site.
          </div>
        </div>
      </section>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="flex items-center justify-between">
        <Link href="/quotes" className="btn-ghost">Cancel</Link>
        <button className="btn-primary px-6 py-2.5" onClick={submit} disabled={pending}>
          {pending ? "Generating…" : "Generate Draft Quote"}
        </button>
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{n}</span>;
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
    >
      {children}
    </button>
  );
}
