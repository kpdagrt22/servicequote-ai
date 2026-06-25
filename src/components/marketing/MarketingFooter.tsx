import Link from "next/link";
import { Logo } from "@/components/Logo";
import { APP_NAME, PRICING_NOT_GUARANTEED } from "@/lib/constants";

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container-page py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm text-gray-500">
              The fast way for service contractors to create editable, branded quotes.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <h3 className="font-semibold text-gray-900">Product</h3>
              <ul className="mt-3 space-y-2 text-gray-500">
                <li><Link href="/#how" className="hover:text-gray-900">How it works</Link></li>
                <li><Link href="/pricing" className="hover:text-gray-900">Pricing</Link></li>
                <li><Link href="/signup" className="hover:text-gray-900">Get started</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Company</h3>
              <ul className="mt-3 space-y-2 text-gray-500">
                <li><Link href="/#faq" className="hover:text-gray-900">FAQ</Link></li>
                <li><a href="mailto:hello@example.com" className="hover:text-gray-900">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Legal</h3>
              <ul className="mt-3 space-y-2 text-gray-500">
                <li><Link href="/legal/terms" className="hover:text-gray-900">Terms</Link></li>
                <li><Link href="/legal/privacy" className="hover:text-gray-900">Privacy</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 border-t border-gray-100 pt-6 text-xs leading-relaxed text-gray-400">
          <p>{PRICING_NOT_GUARANTEED}</p>
          <p className="mt-2">
            © {year} {APP_NAME}. Estimates generated with AI assistance are drafts only and must be
            reviewed by a qualified contractor before being provided to a customer. {APP_NAME} is not
            responsible for pricing decisions, code compliance, or work performed.
          </p>
        </div>
      </div>
    </footer>
  );
}
