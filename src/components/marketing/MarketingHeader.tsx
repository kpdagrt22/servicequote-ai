import Link from "next/link";
import { Logo } from "@/components/Logo";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <Link href="/#how" className="hover:text-gray-900">How it works</Link>
          <Link href="/#use-cases" className="hover:text-gray-900">Use cases</Link>
          <Link href="/pricing" className="hover:text-gray-900">Pricing</Link>
          <Link href="/#faq" className="hover:text-gray-900">FAQ</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost hidden sm:inline-flex">Log in</Link>
          <Link href="/signup" className="btn-primary">Create Your First Quote</Link>
        </div>
      </div>
    </header>
  );
}
