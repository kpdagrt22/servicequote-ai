import { aiConfig } from "@/lib/config";
import {
  quoteExtractionSchema,
  type ExtractQuoteRequest,
  type QuoteExtraction,
} from "@/lib/ai/schemas/quote-extraction";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt";

/**
 * OpenAI provider (placeholder, no SDK dependency).
 *
 * Uses fetch against the Chat Completions JSON-mode API so the project has zero
 * required AI vendor packages. The caller (service.ts) only invokes this when
 * AI_PROVIDER=openai AND OPENAI_API_KEY is set; otherwise the mock runs.
 *
 * Swap in the official SDK / tool-calling for production hardening once a real
 * provider is validated with paying contractors.
 */
export async function openaiExtractQuote(
  req: ExtractQuoteRequest
): Promise<QuoteExtraction> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiConfig.openaiKey}`,
    },
    body: JSON.stringify({
      model: aiConfig.openaiModel,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(req) },
        { role: "user", content: buildUserPrompt(req) },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI request failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  // Validate against the schema so a malformed response can never reach the DB.
  return quoteExtractionSchema.parse(JSON.parse(content));
}
