import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="container-page prose prose-sm max-w-3xl py-16 text-gray-700">
      <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Template — replace with counsel-reviewed policy before launch.</p>

      <h2 className="mt-8 font-semibold text-gray-900">What we collect</h2>
      <p>
        Account details (name, email), your business profile, your price book, customers you add, and the
        job notes and quotes you create.
      </p>

      <h2 className="mt-6 font-semibold text-gray-900">AI processing</h2>
      <p>
        When you generate a draft quote, your job notes and relevant price book items may be sent to an
        AI provider (or processed locally by the built-in mock provider). We do not sell your data.
      </p>

      <h2 className="mt-6 font-semibold text-gray-900">Data isolation</h2>
      <p>
        Your data is isolated per organization using row-level security. Members of one organization
        cannot access another organization&apos;s data.
      </p>

      <h2 className="mt-6 font-semibold text-gray-900">Contact</h2>
      <p>Questions? Email hello@example.com.</p>
    </div>
  );
}
