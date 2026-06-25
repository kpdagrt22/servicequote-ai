import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="container-page prose prose-sm max-w-3xl py-16 text-gray-700">
      <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-500">Template — replace with counsel-reviewed terms before launch.</p>

      <h2 className="mt-8 font-semibold text-gray-900">1. The service</h2>
      <p>
        {APP_NAME} is a quote-drafting tool. It helps contractors generate editable estimates and
        branded proposals. AI-generated content is a <strong>draft only</strong>.
      </p>

      <h2 className="mt-6 font-semibold text-gray-900">2. No pricing guarantee</h2>
      <p>
        {APP_NAME} does not guarantee the accuracy of any price, quantity, material, or labor estimate.
        You are solely responsible for reviewing and approving every quote before providing it to a
        customer, and for the work performed and its compliance with applicable codes and laws.
      </p>

      <h2 className="mt-6 font-semibold text-gray-900">3. Your data</h2>
      <p>
        You retain ownership of your business data, price book, and customer information. We process it
        to provide the service. See our Privacy Policy.
      </p>

      <h2 className="mt-6 font-semibold text-gray-900">4. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {APP_NAME} is not liable for any indirect or
        consequential damages arising from your use of the service or from pricing decisions made using it.
      </p>
    </div>
  );
}
