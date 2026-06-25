"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedDemoData } from "@/lib/actions/demo";

/**
 * Seeds demo data into the current org and jumps to the generated quote.
 * Auth-gated server-side, so this is safe to show in production to org editors.
 */
export function DemoDataButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await seedDemoData();
      if (!res.ok) {
        setError(res.error ?? "Could not seed demo data.");
        return;
      }
      if (res.quoteId) router.push(`/quotes/${res.quoteId}`);
      else router.refresh();
    });
  }

  return (
    <div className={className}>
      <button className="btn-secondary" onClick={run} disabled={pending}>
        {pending ? "Seeding demo…" : "Seed demo data"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
