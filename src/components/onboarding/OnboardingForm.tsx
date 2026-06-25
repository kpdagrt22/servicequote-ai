"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  organizationOnboardingSchema,
  type OrganizationOnboardingInput,
} from "@/lib/validation/org";
import { TRADES, TRADE_LABELS, COUNTRIES, CURRENCIES, DEFAULT_PROPOSAL_FOOTER } from "@/lib/constants";
import { createOrganization } from "@/lib/actions/onboarding";
import { LogoUpload } from "@/components/LogoUpload";

export function OnboardingForm({
  defaultEmail,
  defaultName,
}: {
  defaultEmail: string | null;
  defaultName: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationOnboardingInput>({
    resolver: zodResolver(organizationOnboardingSchema),
    defaultValues: {
      name: "",
      ownerName: defaultName ?? "",
      email: defaultEmail ?? "",
      country: "United States",
      trade: "electrical",
      defaultCurrency: "USD",
      defaultLaborRate: 95,
      defaultMaterialMarkupPercent: 20,
      defaultTaxPercent: 0,
      proposalFooter: DEFAULT_PROPOSAL_FOOTER,
    },
  });

  function onSubmit(values: OrganizationOnboardingInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await createOrganization({ ...values, logoUrl });
      if (!result.ok) {
        setServerError(result.error ?? "Could not create your organization.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Business */}
      <section className="card p-6">
        <h2 className="text-base font-semibold text-gray-900">Your business</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Business name" error={errors.name?.message} required>
            <input className="input" {...register("name")} placeholder="Sparks Electric LLC" />
          </Field>
          <Field label="Trade" error={errors.trade?.message} required>
            <select className="input" {...register("trade")}>
              {TRADES.map((t) => (
                <option key={t} value={t}>{TRADE_LABELS[t]}</option>
              ))}
            </select>
          </Field>
          <Field label="Owner name">
            <input className="input" {...register("ownerName")} placeholder="Jordan Sparks" />
          </Field>
          <Field label="Business email" error={errors.email?.message}>
            <input className="input" type="email" {...register("email")} placeholder="office@sparkselectric.com" />
          </Field>
          <Field label="Phone">
            <input className="input" {...register("phone")} placeholder="(555) 123-4567" />
          </Field>
          <Field label="Website (optional)">
            <input className="input" {...register("website")} placeholder="https://sparkselectric.com" />
          </Field>
        </div>
      </section>

      {/* Location */}
      <section className="card p-6">
        <h2 className="text-base font-semibold text-gray-900">Location</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Street address" className="sm:col-span-2">
            <input className="input" {...register("address")} placeholder="123 Main St" />
          </Field>
          <Field label="City">
            <input className="input" {...register("city")} placeholder="Austin" />
          </Field>
          <Field label="State">
            <input className="input" {...register("state")} placeholder="TX" />
          </Field>
          <Field label="Country" required>
            <select className="input" {...register("country")}>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* Pricing defaults */}
      <section className="card p-6">
        <h2 className="text-base font-semibold text-gray-900">Pricing defaults</h2>
        <p className="mt-1 text-sm text-gray-500">
          These pre-fill new quotes. You can override them on any quote or line item.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <Field label="Currency">
            <select className="input" {...register("defaultCurrency")}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Labor rate / hr">
            <input className="input" type="number" step="0.01" {...register("defaultLaborRate")} />
          </Field>
          <Field label="Material markup %">
            <input className="input" type="number" step="0.01" {...register("defaultMaterialMarkupPercent")} />
          </Field>
          <Field label="Tax %">
            <input className="input" type="number" step="0.01" {...register("defaultTaxPercent")} />
          </Field>
        </div>
      </section>

      {/* Branding */}
      <section className="card p-6">
        <h2 className="text-base font-semibold text-gray-900">Branding & proposal</h2>
        <div className="mt-4 space-y-4">
          <Field label="Logo (optional)">
            <LogoUpload value={logoUrl} onChange={setLogoUrl} />
          </Field>
          <Field label="Proposal footer text">
            <textarea className="input min-h-[72px]" {...register("proposalFooter")} />
          </Field>
          <Field label="License / insurance text (optional)">
            <textarea className="input min-h-[60px]" {...register("licenseText")} placeholder="Licensed & insured · Lic #123456" />
          </Field>
          <Field label="Google review link (optional)">
            <input className="input" {...register("googleReviewUrl")} placeholder="https://g.page/r/…" />
          </Field>
        </div>
      </section>

      {serverError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button type="submit" className="btn-primary px-6 py-2.5" disabled={pending}>
          {pending ? "Creating…" : "Finish setup →"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  error,
  required,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
