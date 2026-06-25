"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  organizationOnboardingSchema,
  type OrganizationOnboardingInput,
} from "@/lib/validation/org";
import { TRADES, TRADE_LABELS, COUNTRIES, CURRENCIES } from "@/lib/constants";
import { updateOrganizationSettings } from "@/lib/actions/settings";
import { LogoUpload } from "@/components/LogoUpload";
import type { Organization } from "@/lib/types/db";

export function SettingsForm({ organization, canEdit }: { organization: Organization; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(organization.logo_url);

  const { register, handleSubmit, formState: { errors } } = useForm<OrganizationOnboardingInput>({
    resolver: zodResolver(organizationOnboardingSchema),
    defaultValues: {
      name: organization.name,
      email: organization.owner_id ? "" : "",
      country: organization.country ?? "United States",
      state: organization.state ?? "",
      city: organization.city ?? "",
      address: organization.address ?? "",
      phone: organization.phone ?? "",
      website: organization.website ?? "",
      trade: (organization.trade as OrganizationOnboardingInput["trade"]) ?? "electrical",
      defaultCurrency: (organization.default_currency as OrganizationOnboardingInput["defaultCurrency"]) ?? "USD",
      defaultLaborRate: organization.default_labor_rate ?? 0,
      defaultMaterialMarkupPercent: organization.default_material_markup_percent ?? 0,
      defaultTaxPercent: organization.default_tax_percent ?? 0,
      proposalFooter: organization.proposal_footer ?? "",
      licenseText: organization.license_text ?? "",
      googleReviewUrl: organization.google_review_url ?? "",
    },
  });

  function onSubmit(values: OrganizationOnboardingInput) {
    setServerError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateOrganizationSettings({ ...values, logoUrl });
      if (!res.ok) return setServerError(res.error ?? "Could not save settings.");
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <fieldset disabled={!canEdit} className="space-y-6">
        <section className="card p-6">
          <h2 className="text-base font-semibold text-gray-900">Business</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Business name" error={errors.name?.message}><input className="input" {...register("name")} /></Field>
            <Field label="Trade">
              <select className="input" {...register("trade")}>
                {TRADES.map((t) => <option key={t} value={t}>{TRADE_LABELS[t]}</option>)}
              </select>
            </Field>
            <Field label="Phone"><input className="input" {...register("phone")} /></Field>
            <Field label="Website"><input className="input" {...register("website")} /></Field>
            <Field label="Address" className="sm:col-span-2"><input className="input" {...register("address")} /></Field>
            <Field label="City"><input className="input" {...register("city")} /></Field>
            <Field label="State"><input className="input" {...register("state")} /></Field>
            <Field label="Country">
              <select className="input" {...register("country")}>{COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </Field>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-gray-900">Pricing defaults</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <Field label="Currency">
              <select className="input" {...register("defaultCurrency")}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </Field>
            <Field label="Labor rate / hr"><input className="input" type="number" step="0.01" {...register("defaultLaborRate")} /></Field>
            <Field label="Material markup %"><input className="input" type="number" step="0.01" {...register("defaultMaterialMarkupPercent")} /></Field>
            <Field label="Tax %"><input className="input" type="number" step="0.01" {...register("defaultTaxPercent")} /></Field>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-gray-900">Branding & proposal</h2>
          <div className="mt-4 space-y-4">
            <Field label="Logo"><LogoUpload value={logoUrl} onChange={setLogoUrl} /></Field>
            <Field label="Proposal footer"><textarea className="input min-h-[72px]" {...register("proposalFooter")} /></Field>
            <Field label="License / insurance text"><textarea className="input min-h-[56px]" {...register("licenseText")} /></Field>
            <Field label="Google review link"><input className="input" {...register("googleReviewUrl")} /></Field>
          </div>
        </section>
      </fieldset>

      {serverError && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</p>}

      {canEdit ? (
        <div className="flex items-center gap-3">
          <button className="btn-primary px-6" disabled={pending}>{pending ? "Saving…" : "Save settings"}</button>
          {saved && <span className="text-sm text-green-600">Saved ✓</span>}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Only owners and admins can edit settings.</p>
      )}
    </form>
  );
}

function Field({ label, children, error, className = "" }: { label: string; children: React.ReactNode; error?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
