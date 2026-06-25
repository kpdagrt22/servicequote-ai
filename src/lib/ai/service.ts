import { aiConfig } from "@/lib/config";
import {
  extractQuoteRequestSchema,
  quoteExtractionSchema,
  type ExtractQuoteRequest,
  type QuoteExtraction,
} from "@/lib/ai/schemas/quote-extraction";
import { mockExtractQuote } from "@/lib/ai/providers/mock";
import { openaiExtractQuote } from "@/lib/ai/providers/openai";
import { anthropicExtractQuote } from "@/lib/ai/providers/anthropic";

/**
 * AI service — the single entry point the app uses to turn job notes into a
 * structured draft quote. It:
 *   1. validates the request,
 *   2. routes to the configured provider (falling back to mock),
 *   3. validates the provider's output against the Zod schema,
 *   4. falls back to the mock if a real provider errors (so the UX never dies),
 * and returns the extraction plus metadata for the ai_extraction_logs table.
 */

export interface ExtractionResult {
  ok: boolean;
  provider: string;
  model: string | null;
  extraction: QuoteExtraction;
  error: string | null;
  /** True when we silently fell back to the mock after a provider error. */
  usedFallback: boolean;
}

export async function extractQuote(
  rawRequest: ExtractQuoteRequest
): Promise<ExtractionResult> {
  const req = extractQuoteRequestSchema.parse(rawRequest);
  const provider = aiConfig.effectiveProvider;

  if (provider === "mock") {
    return {
      ok: true,
      provider: "mock",
      model: "deterministic-mock-v1",
      extraction: mockExtractQuote(req),
      error: null,
      usedFallback: false,
    };
  }

  const model = provider === "openai" ? aiConfig.openaiModel : aiConfig.anthropicModel;
  try {
    const raw =
      provider === "openai"
        ? await openaiExtractQuote(req)
        : await anthropicExtractQuote(req);
    // Defensive: re-validate even though providers already parse.
    const extraction = quoteExtractionSchema.parse(raw);
    return { ok: true, provider, model, extraction, error: null, usedFallback: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Never block the contractor — degrade to the deterministic mock.
    return {
      ok: false,
      provider,
      model,
      extraction: mockExtractQuote(req),
      error: message,
      usedFallback: true,
    };
  }
}
