import type { Metadata } from "next";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/app/ui";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { organization, isEditor } = await requireOrg();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Your business profile, pricing defaults, and proposal branding." />
      <SettingsForm organization={organization} canEdit={isEditor} />
    </div>
  );
}
