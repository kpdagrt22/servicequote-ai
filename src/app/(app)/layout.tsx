import Link from "next/link";
import { requireOrg } from "@/lib/org";

// Authenticated pages must run per-request (auth via cookies); never prerender.
export const dynamic = "force-dynamic";
import { adminConfig } from "@/lib/config";
import { Logo } from "@/components/Logo";
import { AppSidebar } from "@/components/app/AppSidebar";
import { signOut } from "@/lib/actions/auth";
import { TRADE_LABELS } from "@/lib/constants";
import type { Trade } from "@/lib/constants";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { organization, role, email } = await requireOrg();
  const showAdmin = role === "owner" || adminConfig.isAdminEmail(email);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/dashboard" />
            <span className="hidden text-sm text-gray-300 sm:inline">/</span>
            <span className="hidden truncate text-sm font-medium text-gray-600 sm:inline">
              {organization.name}
              <span className="ml-2 badge bg-gray-100 text-gray-500">
                {TRADE_LABELS[organization.trade as Trade] ?? organization.trade}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/quotes/new" className="btn-primary text-sm">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              New quote
            </Link>
            <form action={signOut}>
              <button className="btn-ghost text-sm" title={email ?? undefined}>Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-gray-200 bg-white md:block">
          <AppSidebar showAdmin={showAdmin} />
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {/* Mobile nav */}
          <div className="mb-4 md:hidden">
            <AppSidebar showAdmin={showAdmin} />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
