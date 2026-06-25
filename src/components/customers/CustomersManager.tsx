"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/types/db";
import { EmptyState } from "@/components/app/ui";
import { createCustomer, updateCustomer, deleteCustomer } from "@/lib/actions/customers";

type Draft = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  notes: string;
};

const empty: Draft = { name: "", email: "", phone: "", address: "", city: "", state: "", postal_code: "", notes: "" };

function toDraft(c: Customer): Draft {
  return {
    name: c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    postal_code: c.postal_code ?? "",
    notes: c.notes ?? "",
  };
}

export function CustomersManager({ initialCustomers, canEdit }: { initialCustomers: Customer[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const customers = initialCustomers;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "Something went wrong.");
      onOk?.();
      router.refresh();
    });
  }

  function save() {
    if (!editing) return;
    if (editing.id) run(() => updateCustomer(editing.id!, editing.draft), () => setEditing(null));
    else run(() => createCustomer(editing.draft), () => setEditing(null));
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex items-center gap-2">
          <button className="btn-primary" onClick={() => setEditing({ id: null, draft: { ...empty } })} disabled={pending}>
            Add customer
          </button>
          <span className="ml-auto text-sm text-gray-500">{customers.length} customer{customers.length === 1 ? "" : "s"}</span>
        </div>
      )}

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {editing && canEdit && (
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900">{editing.id ? "Edit customer" : "New customer"}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Name *"><input className="input" value={editing.draft.name} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, name: e.target.value } })} /></Field>
            <Field label="Email"><input className="input" type="email" value={editing.draft.email} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, email: e.target.value } })} /></Field>
            <Field label="Phone"><input className="input" value={editing.draft.phone} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, phone: e.target.value } })} /></Field>
            <Field label="Address"><input className="input" value={editing.draft.address} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, address: e.target.value } })} /></Field>
            <Field label="City"><input className="input" value={editing.draft.city} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, city: e.target.value } })} /></Field>
            <Field label="State"><input className="input" value={editing.draft.state} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, state: e.target.value } })} /></Field>
            <Field label="Postal code"><input className="input" value={editing.draft.postal_code} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, postal_code: e.target.value } })} /></Field>
            <Field label="Notes" className="sm:col-span-2"><textarea className="input min-h-[60px]" value={editing.draft.notes} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, notes: e.target.value } })} /></Field>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={save} disabled={pending || !editing.draft.name.trim()}>Save</button>
            <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      {customers.length === 0 ? (
        <EmptyState title="No customers yet" description="Add a customer here, or create one on the fly when you build a quote." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Location</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    {c.notes && <div className="text-xs text-gray-400">{c.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div className="text-gray-500">{c.phone}</div>}
                    {!c.email && !c.phone && "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {[c.city, c.state].filter(Boolean).join(", ") || c.address || "—"}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs font-medium text-gray-600 hover:underline" onClick={() => setEditing({ id: c.id, draft: toDraft(c) })}>Edit</button>
                      <button
                        className="ml-3 text-xs font-medium text-red-600 hover:underline"
                        onClick={() => { if (confirm(`Delete "${c.name}"?`)) run(() => deleteCustomer(c.id)); }}
                        disabled={pending}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
