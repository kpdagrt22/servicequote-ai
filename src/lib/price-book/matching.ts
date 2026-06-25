import type { PriceBookRef } from "@/lib/ai/schemas/quote-extraction";

/**
 * Lightweight, deterministic price-book matching.
 *
 * Given a free-text line-item name/description and the org's price book, find
 * the best matching price book item by token overlap (Jaccard-ish score with a
 * small bonus for exact-phrase containment). Pure and dependency-free so it is
 * unit-tested and reused by the mock AI provider and by post-processing of real
 * provider output.
 */

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "for", "with", "in", "on",
  "per", "each", "new", "install", "replace", "repair", "service",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export interface MatchResult {
  item: PriceBookRef;
  score: number;
}

/**
 * Score a query string against a single price book item (0..1).
 * Exported for tests and tuning.
 */
export function scoreMatch(query: string, item: PriceBookRef): number {
  const queryTokens = new Set(tokenize(query));
  const itemTokens = new Set(tokenize(item.name + " " + (item.category ?? "")));
  if (queryTokens.size === 0 || itemTokens.size === 0) return 0;

  let shared = 0;
  for (const t of itemTokens) {
    if (queryTokens.has(t)) shared += 1;
  }
  const union = new Set([...queryTokens, ...itemTokens]).size;
  let score = shared / union;

  // Bonus when the full item name appears as a phrase in the query.
  if (item.name && query.toLowerCase().includes(item.name.toLowerCase())) {
    score = Math.min(1, score + 0.4);
  }
  return score;
}

/**
 * Find the best price book match above a threshold, or null.
 * Default threshold (0.34) avoids weak single-token coincidences.
 */
export function findBestMatch(
  query: string,
  priceBook: PriceBookRef[],
  threshold = 0.34
): MatchResult | null {
  let best: MatchResult | null = null;
  for (const item of priceBook) {
    const score = scoreMatch(query, item);
    if (score >= threshold && (!best || score > best.score)) {
      best = { item, score };
    }
  }
  return best;
}
