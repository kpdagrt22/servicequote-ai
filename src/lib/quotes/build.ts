import type { SuggestedLineItem } from "@/lib/ai/schemas/quote-extraction";
import type { PriceBookItem } from "@/lib/types/db";
import { computeLineItem } from "@/lib/quotes/calculations";

/** A line-item row ready to insert (minus quote_id, set by the caller). */
export interface NewLineItem {
  price_book_item_id: string | null;
  sort_order: number;
  category: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  material_cost: number;
  labor_minutes: number;
  labor_rate: number;
  markup_percent: number;
  unit_price: number;
  total_price: number;
  ai_generated: boolean;
  confidence: number | null;
}

export interface QuoteDefaults {
  laborRate: number;
  markupPercent: number;
}

/**
 * Turn one AI-suggested line item into a concrete quote line item, resolving a
 * matched price book item (preferred source of truth) and applying the org's
 * default labor rate / markup. Pure so it is unit-testable.
 */
export function lineItemFromSuggestion(
  suggestion: SuggestedLineItem,
  priceBookItem: PriceBookItem | undefined,
  defaults: QuoteDefaults,
  sortOrder: number
): NewLineItem {
  const materialCost = Number(
    priceBookItem?.material_cost ?? suggestion.suggested_material_cost ?? 0
  );
  const laborMinutes = Number(
    priceBookItem?.labor_minutes ?? suggestion.suggested_labor_minutes ?? 0
  );
  const markupPercent = Number(
    priceBookItem?.markup_percent ?? defaults.markupPercent ?? 0
  );
  const laborRate = Number(defaults.laborRate ?? 0);
  const quantity = Number(
    suggestion.quantity || priceBookItem?.default_quantity || 1
  );

  const override = priceBookItem?.price_override != null ? Number(priceBookItem.price_override) : null;
  const computed = computeLineItem(
    { quantity, materialCost, laborMinutes, laborRate, markupPercent },
    override
  );

  return {
    price_book_item_id: priceBookItem?.id ?? suggestion.matched_price_book_item_id ?? null,
    sort_order: sortOrder,
    category: priceBookItem?.category ?? suggestion.category ?? null,
    name: priceBookItem?.name ?? suggestion.name,
    description: suggestion.description ?? priceBookItem?.description ?? null,
    quantity,
    unit: priceBookItem?.unit ?? suggestion.unit ?? "each",
    material_cost: materialCost,
    labor_minutes: laborMinutes,
    labor_rate: laborRate,
    markup_percent: markupPercent,
    unit_price: computed.unitPrice,
    total_price: computed.totalPrice,
    ai_generated: true,
    confidence: suggestion.confidence ?? null,
  };
}

/** Join an array of strings into a newline-delimited text blob (for storage). */
export function listToText(items: string[]): string | null {
  const cleaned = items.map((s) => s.trim()).filter(Boolean);
  return cleaned.length ? cleaned.map((s) => `• ${s}`).join("\n") : null;
}
