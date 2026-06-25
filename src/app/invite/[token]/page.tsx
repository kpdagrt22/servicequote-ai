import type { Metadata } from "next";
import { requireUser } from "@/lib/org";
import { Logo } from "@/components/Logo";
import { AcceptInvite } from "@/components/invite/AcceptInvite";

export const metadata: Metadata = { title: "Accept invitation", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Invite-acceptance page. Auth-gated (middleware redirects anon users to /login
 * with redirectedFrom=/invite/<token>, so they return here after signing in).
 * The actual membership write happens in the acceptInvitation server action.
 */
export default async function InvitePage({ params }: { params: { token: string } }) {
  const { email } = await requireUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="card p-8">
          <AcceptInvite token={params.token} signedInEmail={email} />
        </div>
      </div>
    </div>
  );
}
