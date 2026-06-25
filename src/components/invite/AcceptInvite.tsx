"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptInvitation } from "@/lib/actions/team";

/**
 * Client control on the invite-acceptance page. The user is already signed in
 * (the route is auth-gated by middleware); clicking accepts the invitation via
 * the service-role-backed server action.
 */
export function AcceptInvite({ token, signedInEmail }: { token: string; signedInEmail: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function accept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptInvitation(token);
      if (!res.ok) {
        setError(res.error ?? "Could not accept the invitation.");
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-900">You're in! 🎉</p>
        <p className="mt-1 text-sm text-gray-500">You now have access to this organization.</p>
        <Link href="/dashboard" className="btn-primary mt-4 inline-flex">Go to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="text-xl font-bold text-gray-900">Accept your invitation</h1>
      <p className="mt-1 text-sm text-gray-500">
        {signedInEmail ? `Signed in as ${signedInEmail}.` : "Signed in."} Accept to join the organization.
      </p>
      <button className="btn-primary mt-4 w-full justify-center" onClick={accept} disabled={pending}>
        {pending ? "Accepting…" : "Accept invitation"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
