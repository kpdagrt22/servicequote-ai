import { round2 } from "@/lib/utils";

/**
 * Pure pricing math for quotes. No I/O, no framework — so it is trivially
 * unit-tested and identical on server and client (the editable quote screen
 * recalculates totals live using exactly these functions).
 *
 * Pricing model for one line item
 * --------------------------------
 *   unit cost   = material_cost + (labor_minutes / 60) * labor_rate
 *   unit price  = unit cost * (1 + markup_percent / 100)
 *   line total  = unit price * quantity
 *
 * `material_cost`, `labor_rate` and `unit_price` are PER UNIT amounts.
 * A line item may carry an explicit `unit_price` (e.g. a flat-rate book item
 * or a contractor override); callers decide whether to recompute from
 * components or keep the override. `computeLineItem` returns both so the UI can
 * show the suggested price while letting the user type their own.
 */

export interface LineItemComponents {
  quantity: number;
  materialCost: number; // per unit
  laborMinutes: number; // per unit
  laborRate: number; // per hour
  markupPercent: number;
}

/** Labor cost for a single unit, given minutes and an hourly rate. */
export function laborCost(laborMinutes: number, laborRate: number): number {
  const minutes = Math.max(0, laborMinutes || 0);
  const rate = Math.max(0, laborRate || 0);
  return round2((minutes / 60) * rate);
}

/** Per-unit cost before markup (materials + labor). */
export function unitCost(materialCost: number, laborMinutes: number, laborRate: number): number {
  const material = Math.max(0, materialCost || 0);
  return round2(material + laborCost(laborMinutes, laborRate));
}

/** Apply a markup percentage to a cost. `applyMarkup(100, 20) === 120`. */
export function applyMarkup(cost: number, markupPercent: number): number {
  const base = Math.max(0, cost || 0);
  const markup = markupPercent || 0;
  return round2(base * (1 + markup / 100));
}

/** Suggested per-unit price computed from components (cost + markup). */
export function computeUnitPrice(c: LineItemComponents): number {
  return applyMarkup(unitCost(c.materialCost, c.laborMinutes, c.laborRate), c.markupPercent);
}

/** Line total for an explicit unit price and quantity. */
export function computeLineTotal(unitPrice: number, quantity: number): number {
  const price = Math.max(0, unitPrice || 0);
  const qty = Math.max(0, quantity || 0);
  return round2(price * qty);
}

export interface ComputedLineItem {
  unitCost: number;
  /** Suggested unit price derived from components. */
  suggestedUnitPrice: number;
  /** Effective unit price actually used (override if provided, else suggested). */
  unitPrice: number;
  totalPrice: number;
}

/**
 * Compute a full line item. If `unitPriceOverride` is a finite number it wins
 * (the contractor typed their own price); otherwise the component-derived
 * suggested price is used.
 */
export function computeLineItem(
  c: LineItemComponents,
  unitPriceOverride?: number | null
): ComputedLineItem {
  const cost = unitCost(c.materialCost, c.laborMinutes, c.laborRate);
  const suggested = applyMarkup(cost, c.markupPercent);
  const hasOverride =
    unitPriceOverride != null && Number.isFinite(unitPriceOverride);
  const unitPrice = hasOverride ? round2(unitPriceOverride as number) : suggested;
  return {
    unitCost: cost,
    suggestedUnitPrice: suggested,
    unitPrice,
    totalPrice: computeLineTotal(unitPrice, c.quantity),
  };
}

export interface QuoteTotalsInput {
  lineTotals: number[];
  taxPercent: number;
}

export interface QuoteTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

/** Sum line totals, apply tax on the subtotal, return rounded totals. */
export function computeQuoteTotals({ lineTotals, taxPercent }: QuoteTotalsInput): QuoteTotals {
  const subtotal = round2(
    lineTotals.reduce((sum, t) => sum + (Number.isFinite(t) ? t : 0), 0)
  );
  const tax = Math.max(0, taxPercent || 0);
  const taxAmount = round2(subtotal * (tax / 100));
  const total = round2(subtotal + taxAmount);
  return { subtotal, taxAmount, total };
}

/**
 * Convenience: compute totals straight from a list of line-item components +
 * optional per-line price overrides. Used by both the editor and the server.
 */
export function computeQuoteFromLines(
  lines: Array<LineItemComponents & { unitPriceOverride?: number | null }>,
  taxPercent: number
): QuoteTotals & { lines: ComputedLineItem[] } {
  const computed = lines.map((l) => computeLineItem(l, l.unitPriceOverride));
  const totals = computeQuoteTotals({
    lineTotals: computed.map((c) => c.totalPrice),
    taxPercent,
  });
  return { ...totals, lines: computed };
}
