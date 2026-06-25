import { aiConfig } from "@/lib/config";
import {
  quoteExtractionSchema,
  type ExtractQuoteRequest,
  type QuoteExtraction,
} from "@/lib/ai/schemas/quote-extraction";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt";

/**
 * Anthropic provider (placeholder, no SDK dependency).
 *
 * Uses fetch against the Messages API. Invoked only when AI_PROVIDER=anthropic
 * AND ANTHROPIC_API_KEY is set. We ask the model to return a single JSON object
 * matching quoteExtractionSchema and validate it before use.
 */
export async function anthropicExtractQuote(
  req: ExtractQuoteRequest
): Promise<QuoteExtraction> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": aiConfig.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: aiConfig.anthropicModel,
      max_tokens: 2048,
      system: buildSystemPrompt(req) + "\n\nReturn ONLY the JSON object, no prose.",
      messages: [{ role: "user", content: buildUserPrompt(req) }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic request failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = json.content?.[0]?.text ?? "{}";
  // Models sometimes wrap JSON in prose/fences; extract the first {...} block.
  const match = text.match(/\{[\s\S]*\}/);
  return quoteExtractionSchema.parse(JSON.parse(match ? match[0] : text));
}
