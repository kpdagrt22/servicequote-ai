"use client";

import { useState } from "react";
import type { CustomerResponse as CustomerResponseValue } from "@/lib/constants";

/**
 * Customer-facing accept/decline control on the public proposal page. Posts to
 * the token-guarded /api/proposals/[token]/respond endpoint. Shows the recorded
 * decision when the quote has already been responded to.
 */
export function CustomerResponse({
  token,
  respondable,
  initialResponse,
}: {
  token: string;
  respondable: boolean;
  initialResponse: CustomerResponseValue | null;
}) {
  const [response, setResponse] = useState<CustomerResponseValue | null>(initialResponse);
  const [pending, setPending] = useState<CustomerResponseValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(value: CustomerResponseValue) {
    setError(null);
    setPending(value);
    try {
      const res = await fetch(`/api/proposals/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: value }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResponse(value);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(null);
    }
  }

  if (response) {
    const accepted = response === "accepted";
    return (
      <div
        className={`rounded-xl border p-5 text-center ${
          accepted ? "border-green-200 bg-green-50 text-green-800" : "border-gray-200 bg-gray-50 text-gray-700"
        }`}
      >
        <p className="text-lg font-semibold">
          {accepted ? "✓ You accepted this quote" : "You declined this quote"}
        </p>
        <p className="mt-1 text-sm">
          {accepted
            ? "Thank you! Your contractor has been notified and will follow up."
            : "Your contractor has been notified. Contact them if you'd like to discuss changes."}
        </p>
      </div>
    );
  }

  if (!respondable) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-500">
        This proposal isn&apos;t currently awaiting a response. Please contact your contractor with any questions.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-center text-sm font-medium text-gray-700">Ready to proceed?</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => submit("accepted")}
          disabled={pending !== null}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {pending === "accepted" ? "Submitting…" : "Accept this quote"}
        </button>
        <button
          onClick={() => submit("declined")}
          disabled={pending !== null}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {pending === "declined" ? "Submitting…" : "Decline"}
        </button>
      </div>
      {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
      <p className="mt-3 text-center text-xs text-gray-400">
        Accepting indicates your approval of the scope and pricing above.
      </p>
    </div>
  );
}
