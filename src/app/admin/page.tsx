import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminConfig, supabaseConfig } from "@/lib/config";
import { Logo } from "@/components/Logo";
import { signOut } from "@/lib/actions/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm">{children}</p>
    </div>
  );
}

export default async function AdminPage() {
  const auth = createSupabaseServerClient();
  if (!auth) redirect("/login");
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const isAllowed = adminConfig.isAdminEmail(user.email);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo href="/dashboard" />
            <span className="badge bg-red-100 text-red-700">Internal admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="btn-ghost text-sm">App</Link>
            <form action={signOut}><button className="btn-ghost text-sm">Sign out</button></form>
          </div>
        </div>
      </header>
      <div className="container-page py-8">{children}</div>
    </div>
  );

  if (adminConfig.emails.length === 0) {
    return shell(<Notice title="Admin not enabled">Set <code>ADMIN_EMAILS</code> (comma-separated) in your environment to enable the internal admin view.</Notice>);
  }
  if (!isAllowed) {
    return shell(<Notice title="Not authorized">Your account ({user.email}) isn&apos;t on the <code>ADMIN_EMAILS</code> allowlist.</Notice>);
  }

  const admin = createSupabaseAdminClient();
  if (!admin || !supabaseConfig.hasServiceRole) {
    return shell(<Notice title="Service role key required">Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to view cross-organization data here.</Notice>);
  }

  const [{ data: orgs }, { data: quotes }, { data: aiErrors }] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name, trade, onboarding_completed, created_at, owner:profiles!organizations_owner_id_fkey(email)")
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("quotes")
      .select("id, quote_number, status, total, currency, created_at, organization:organizations(name)")
      .order("created_at", { ascending: false })
      .limit(25),
    admin
      .from("ai_extraction_logs")
      .select("id, provider, model, status, error_message, created_at, organization:organizations(name)")
      .in("status", ["failed", "fallback"])
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const orgList = (orgs ?? []) as unknown as Array<{ id: string; name: string; trade: string; onboarding_completed: boolean; created_at: string; owner: { email: string | null } | null }>;
  const quoteList = (quotes ?? []) as unknown as Array<{ id: string; quote_number: string | null; status: string; total: number; currency: string; created_at: string; organization: { name: string } | null }>;
  const errorList = (aiErrors ?? []) as unknown as Array<{ id: string; provider: string; model: string | null; status: string; error_message: string | null; created_at: string; organization: { name: string } | null }>;

  const onboarded = orgList.filter((o) => o.onboarding_completed).length;

  return shell(
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Organizations" value={orgList.length} />
        <Stat label="Onboarding complete" value={`${onboarded}/${orgList.length}`} />
        <Stat label="AI errors / fallbacks (recent)" value={errorList.length} />
      </div>

      <Section title="Organizations">
        <Table head={["Name", "Trade", "Owner", "Onboarded", "Created"]}>
          {orgList.map((o) => (
            <tr key={o.id} className="border-t border-gray-100">
              <td className="px-4 py-2 font-medium text-gray-900">{o.name}</td>
              <td className="px-4 py-2 text-gray-600">{o.trade}</td>
              <td className="px-4 py-2 text-gray-600">{o.owner?.email ?? "—"}</td>
              <td className="px-4 py-2">{o.onboarding_completed ? "✅" : "—"}</td>
              <td className="px-4 py-2 text-gray-500">{formatDateTime(o.created_at)}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Recent quotes">
        <Table head={["Quote", "Org", "Status", "Total", "Created"]}>
          {quoteList.map((q) => (
            <tr key={q.id} className="border-t border-gray-100">
              <td className="px-4 py-2 font-mono text-gray-700">{q.quote_number ?? "Draft"}</td>
              <td className="px-4 py-2 text-gray-600">{q.organization?.name ?? "—"}</td>
              <td className="px-4 py-2 text-gray-600">{q.status}</td>
              <td className="px-4 py-2 text-gray-900">{formatCurrency(Number(q.total), q.currency)}</td>
              <td className="px-4 py-2 text-gray-500">{formatDateTime(q.created_at)}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="AI errors & fallbacks">
        {errorList.length === 0 ? (
          <p className="card p-4 text-sm text-gray-500">No AI errors recorded. 🎉</p>
        ) : (
          <Table head={["Org", "Provider", "Status", "Error", "When"]}>
            {errorList.map((e) => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="px-4 py-2 text-gray-600">{e.organization?.name ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">{e.provider}{e.model ? ` (${e.model})` : ""}</td>
                <td className="px-4 py-2 text-gray-600">{e.status}</td>
                <td className="px-4 py-2 max-w-xs truncate text-red-600" title={e.error_message ?? ""}>{e.error_message ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">{formatDateTime(e.created_at)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
