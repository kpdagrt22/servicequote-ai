import type { ExtractQuoteRequest } from "@/lib/ai/schemas/quote-extraction";

/**
 * Prompt construction shared by the OpenAI and Anthropic providers.
 * Encodes the product guardrails so a real model behaves like the mock:
 * produce a DRAFT only, prefer matching the contractor's own price book, never
 * claim guaranteed pricing, and surface risks/questions instead of guessing.
 */

export function buildSystemPrompt(req: ExtractQuoteRequest): string {
  const { context } = req;
  return [
    `You are an estimating assistant for "${context.businessName}", a ${context.trade} service contractor in the US.`,
    "Read the contractor's free-text job notes and produce a STRUCTURED DRAFT quote.",
    "",
    "Hard rules:",
    "- You produce a DRAFT only. The contractor reviews and edits every line and price before sending. Never imply pricing is final or guaranteed.",
    "- Prefer the contractor's existing price book. When a job item clearly matches a price book item, set matched_price_book_item_id to that item's id and reuse its unit.",
    "- Only suggest material costs / labor minutes you can reasonably infer. If unsure, leave them null and lower the confidence — do NOT invent precise prices.",
    "- Break the job into clear, sellable line items (materials + labor as the contractor would list them).",
    "- Put anything that could change the price (access, permits, hidden damage, code upgrades) into risk_flags, and anything you need the customer to clarify into questions_for_contractor.",
    "- Keep scope_summary to 1-3 sentences a homeowner would understand.",
    "",
    "Return ONLY a single JSON object with these keys:",
    "job_type (string), scope_summary (string), assumptions (string[]), exclusions (string[]),",
    "suggested_line_items (array of { category, name, description, quantity, unit, matched_price_book_item_id, suggested_material_cost, suggested_labor_minutes, confidence (0-1), reason }),",
    "risk_flags (string[]), questions_for_contractor (string[]), confidence (0-1).",
  ].join("\n");
}

export function buildUserPrompt(req: ExtractQuoteRequest): string {
  const lines: string[] = [];
  lines.push("JOB NOTES:");
  lines.push(req.jobDescription);
  if (req.jobLocation) {
    lines.push("", `JOB LOCATION: ${req.jobLocation}`);
  }
  if (req.context.defaultLaborRate != null) {
    lines.push("", `Default labor rate: $${req.context.defaultLaborRate}/hour`);
  }
  if (req.context.defaultMarkupPercent != null) {
    lines.push(`Default material markup: ${req.context.defaultMarkupPercent}%`);
  }
  if (req.priceBook.length > 0) {
    lines.push("", "PRICE BOOK (match against these where possible):");
    for (const item of req.priceBook.slice(0, 100)) {
      lines.push(
        `- id=${item.id} | ${item.name}${item.category ? ` [${item.category}]` : ""}` +
          `${item.unit ? ` | unit=${item.unit}` : ""}` +
          `${item.material_cost != null ? ` | material=$${item.material_cost}` : ""}` +
          `${item.labor_minutes != null ? ` | labor=${item.labor_minutes}min` : ""}`
      );
    }
  } else {
    lines.push("", "PRICE BOOK: (empty — suggest items from scratch)");
  }
  return lines.join("\n");
}
