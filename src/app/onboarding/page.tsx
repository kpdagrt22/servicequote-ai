import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser, getOrganizationOrNull } from "@/lib/org";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { signOut } from "@/lib/actions/auth";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Set up your business" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { email, profile } = await requireUser();
  const existing = await getOrganizationOrNull();
  if (existing) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo href="/onboarding" />
          <form action={signOut}>
            <button className="btn-ghost text-sm">Sign out</button>
          </form>
        </div>
      </header>
      <div className="container-page max-w-3xl py-10">
        <h1 className="text-2xl font-bold text-gray-900">Set up your business</h1>
        <p className="mt-2 text-gray-600">
          This takes about two minutes. We&apos;ll use these details to brand your quotes and pre-fill pricing.
          You can change everything later in Settings.
        </p>
        <div className="mt-8">
          <OnboardingForm defaultEmail={email} defaultName={profile?.full_name ?? null} />
        </div>
      </div>
    </div>
  );
}
