"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PriceBookItem } from "@/lib/types/db";
import { PRICE_BOOK_UNITS, PRICE_BOOK_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { computeUnitPrice } from "@/lib/quotes/calculations";
import { EmptyState } from "@/components/app/ui";
import {
  createPriceBookItem,
  updatePriceBookItem,
  deletePriceBookItem,
  setPriceBookItemActive,
  loadExampleItems,
  importPriceBookCsv,
} from "@/lib/actions/price-book";

type Draft = {
  category: string;
  name: string;
  description: string;
  unit: string;
  default_quantity: string;
  material_cost: string;
  labor_minutes: string;
  markup_percent: string;
  price_override: string;
};

const emptyDraft: Draft = {
  category: "",
  name: "",
  description: "",
  unit: "each",
  default_quantity: "1",
  material_cost: "0",
  labor_minutes: "0",
  markup_percent: "0",
  price_override: "",
};

function toDraft(item: PriceBookItem): Draft {
  return {
    category: item.category ?? "",
    name: item.name,
    description: item.description ?? "",
    unit: item.unit ?? "each",
    default_quantity: String(item.default_quantity ?? 1),
    material_cost: String(item.material_cost ?? 0),
    labor_minutes: String(item.labor_minutes ?? 0),
    markup_percent: String(item.markup_percent ?? 0),
    price_override: item.price_override != null ? String(item.price_override) : "",
  };
}

export function PriceBookManager({
  initialItems,
  currency,
  defaultLaborRate,
  canEdit,
}: {
  initialItems: PriceBookItem[];
  currency: string;
  defaultLaborRate: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const items = initialItems;
  const hasItems = items.length > 0;

  const effectivePrice = (i: PriceBookItem) =>
    i.price_override != null
      ? Number(i.price_override)
      : computeUnitPrice({
          quantity: 1,
          materialCost: Number(i.material_cost ?? 0),
          laborMinutes: Number(i.labor_minutes ?? 0),
          laborRate: defaultLaborRate,
          markupPercent: Number(i.markup_percent ?? 0),
        });

  function refresh() {
    router.refresh();
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      onOk?.();
      refresh();
    });
  }

  function save() {
    if (!editing) return;
    const payload = {
      ...editing.draft,
      active: true,
    };
    if (editing.id) {
      run(() => updatePriceBookItem(editing.id!, payload), () => setEditing(null));
    } else {
      run(() => createPriceBookItem(payload), () => setEditing(null));
    }
  }

  const sortedByCategory = useMemo(() => items, [items]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <button className="btn-primary" onClick={() => setEditing({ id: null, draft: { ...emptyDraft } })} disabled={pending}>
            Add item
          </button>
        )}
        {canEdit && !hasItems && (
          <button className="btn-secondary" onClick={() => run(loadExampleItems)} disabled={pending}>
            Load example items
          </button>
        )}
        {canEdit && (
          <button className="btn-secondary" onClick={() => setCsvOpen((v) => !v)} disabled={pending}>
            Import CSV
          </button>
        )}
        <span className="ml-auto text-sm text-gray-500">{items.length} item{items.length === 1 ? "" : "s"}</span>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{notice}</p>}

      {/* CSV import */}
      {csvOpen && canEdit && (
        <div className="card p-4">
          <p className="text-sm font-medium text-gray-700">Paste CSV</p>
          <p className="mt-1 text-xs text-gray-500">
            Header row with columns: category, name, description, unit, default_quantity, material_cost, labor_minutes, markup_percent, price_override. Only <code>name</code> is required.
          </p>
          <textarea
            className="input mt-2 min-h-[120px] font-mono text-xs"
            placeholder={"category,name,unit,material_cost,labor_minutes,markup_percent\nDevices,Install outlet,each,6,30,20"}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <button
              className="btn-primary"
              disabled={pending || !csv.trim()}
              onClick={() =>
                run(
                  async () => {
                    const res = await importPriceBookCsv(csv);
                    if (res.ok) setNotice(`Imported ${res.imported ?? 0} item(s).`);
                    return res;
                  },
                  () => {
                    setCsv("");
                    setCsvOpen(false);
                  }
                )
              }
            >
              Import
            </button>
            <button className="btn-ghost" onClick={() => setCsvOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Editor */}
      {editing && canEdit && (
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900">{editing.id ? "Edit item" : "New item"}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DraftField label="Category">
              <input className="input" list="pb-category-options" placeholder="e.g. installation" value={editing.draft.category} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, category: e.target.value } })} />
              <datalist id="pb-category-options">
                {PRICE_BOOK_CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </DraftField>
            <DraftField label="Name *"><input className="input" value={editing.draft.name} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, name: e.target.value } })} /></DraftField>
            <DraftField label="Unit">
              <select className="input" value={editing.draft.unit} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, unit: e.target.value } })}>
                {PRICE_BOOK_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </DraftField>
            <DraftField label="Description" className="sm:col-span-2 lg:col-span-3"><input className="input" value={editing.draft.description} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, description: e.target.value } })} /></DraftField>
            <DraftField label="Default qty"><input className="input" type="number" step="0.01" value={editing.draft.default_quantity} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, default_quantity: e.target.value } })} /></DraftField>
            <DraftField label="Material cost"><input className="input" type="number" step="0.01" value={editing.draft.material_cost} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, material_cost: e.target.value } })} /></DraftField>
            <DraftField label="Labor minutes"><input className="input" type="number" step="1" value={editing.draft.labor_minutes} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, labor_minutes: e.target.value } })} /></DraftField>
            <DraftField label="Markup %"><input className="input" type="number" step="0.01" value={editing.draft.markup_percent} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, markup_percent: e.target.value } })} /></DraftField>
            <DraftField label="Price override (optional)"><input className="input" type="number" step="0.01" placeholder="Flat price" value={editing.draft.price_override} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, price_override: e.target.value } })} /></DraftField>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" onClick={save} disabled={pending || !editing.draft.name.trim()}>Save item</button>
            <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table / empty state */}
      {!hasItems ? (
        <EmptyState
          title="Add your common services so AI can build better quotes."
          description="Your price book is the accuracy layer — add items and prices, or load examples to start fast."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 text-right font-medium">Material</th>
                <th className="px-4 py-3 text-right font-medium">Labor min</th>
                <th className="px-4 py-3 text-right font-medium">Markup</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Active</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedByCategory.map((i) => (
                <tr key={i.id} className={i.active ? "" : "opacity-50"}>
                  <td className="px-4 py-3 text-gray-500">{i.category || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{i.name}</div>
                    {i.description && <div className="text-xs text-gray-400">{i.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{i.unit || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(Number(i.material_cost ?? 0), currency)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{Number(i.labor_minutes ?? 0)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{Number(i.markup_percent ?? 0)}%</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(effectivePrice(i), currency)}</td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <button
                        className="text-xs font-medium text-brand-700 hover:underline"
                        onClick={() => run(() => setPriceBookItemActive(i.id, !i.active))}
                        disabled={pending}
                      >
                        {i.active ? "Active" : "Inactive"}
                      </button>
                    ) : (
                      <span>{i.active ? "Active" : "Inactive"}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs font-medium text-gray-600 hover:underline" onClick={() => setEditing({ id: i.id, draft: toDraft(i) })}>Edit</button>
                      <button
                        className="ml-3 text-xs font-medium text-red-600 hover:underline"
                        onClick={() => {
                          if (confirm(`Delete "${i.name}"? This cannot be undone.`)) run(() => deletePriceBookItem(i.id));
                        }}
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

function DraftField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
