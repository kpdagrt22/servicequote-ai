"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/org";
import { priceBookItemSchema } from "@/lib/validation/price-book";
import { EXAMPLE_PRICE_BOOK } from "@/lib/price-book/examples";
import type { Trade } from "@/lib/constants";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function ensureEditor() {
  const ctx = await requireOrg();
  if (!ctx.isEditor) throw new Error("You don't have permission to edit the price book.");
  return ctx;
}

export async function createPriceBookItem(values: unknown): Promise<ActionResult> {
  const parsed = priceBookItemSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };
  const { supabase, organization } = await ensureEditor();
  const { error } = await supabase.from("price_book_items").insert({
    organization_id: organization.id,
    trade: organization.trade,
    source: "manual",
    ...parsed.data,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/price-book");
  return { ok: true };
}

export async function updatePriceBookItem(id: string, values: unknown): Promise<ActionResult> {
  const parsed = priceBookItemSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };
  const { supabase, organization } = await ensureEditor();
  const { error } = await supabase
    .from("price_book_items")
    .update(parsed.data)
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/price-book");
  return { ok: true };
}

export async function setPriceBookItemActive(id: string, active: boolean): Promise<ActionResult> {
  const { supabase, organization } = await ensureEditor();
  const { error } = await supabase
    .from("price_book_items")
    .update({ active })
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/price-book");
  return { ok: true };
}

export async function deletePriceBookItem(id: string): Promise<ActionResult> {
  const { supabase, organization } = await ensureEditor();
  const { error } = await supabase
    .from("price_book_items")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/price-book");
  return { ok: true };
}

/** Insert the trade-appropriate example items (skips if any already exist). */
export async function loadExampleItems(): Promise<ActionResult> {
  const { supabase, organization } = await ensureEditor();
  const trade = organization.trade as Trade;
  const examples = EXAMPLE_PRICE_BOOK[trade] ?? EXAMPLE_PRICE_BOOK.electrical ?? [];
  if (examples.length === 0) return { ok: false, error: "No examples for this trade yet." };

  const rows = examples.map((e) => ({
    organization_id: organization.id,
    trade,
    source: "seed",
    active: true,
    ...e,
  }));
  const { error } = await supabase.from("price_book_items").insert(rows);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/price-book");
  return { ok: true };
}

/**
 * Minimal CSV import. Expects a header row with any of:
 * category,name,description,unit,default_quantity,material_cost,labor_minutes,markup_percent,price_override
 * Only `name` is required per row. Returns the number of rows imported.
 */
export async function importPriceBookCsv(csv: string): Promise<ActionResult & { imported?: number }> {
  const { supabase, organization } = await ensureEditor();
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { ok: false, error: "CSV needs a header row and at least one data row." };

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const idx = (key: string) => headers.indexOf(key);

  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const name = (cols[idx("name")] ?? "").trim();
    if (!name) continue;
    const parsed = priceBookItemSchema.safeParse({
      name,
      category: cols[idx("category")],
      description: cols[idx("description")],
      unit: cols[idx("unit")],
      default_quantity: cols[idx("default_quantity")],
      material_cost: cols[idx("material_cost")],
      labor_minutes: cols[idx("labor_minutes")],
      markup_percent: cols[idx("markup_percent")],
      price_override: cols[idx("price_override")],
    });
    if (parsed.success) {
      rows.push({
        organization_id: organization.id,
        trade: organization.trade,
        source: "import",
        ...parsed.data,
      });
    }
  }
  if (rows.length === 0) return { ok: false, error: "No valid rows found (each row needs a name)." };

  const { error } = await supabase.from("price_book_items").insert(rows);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/price-book");
  return { ok: true, imported: rows.length };
}

/** Split a single CSV line, honouring simple double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
