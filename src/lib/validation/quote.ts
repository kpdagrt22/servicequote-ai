import { z } from "zod";
import { QUOTE_STATUSES } from "@/lib/constants";

const numv = (def = 0) =>
  z.union([z.number(), z.string()]).optional().transform((v) => {
    if (v === undefined || v === null || v === "") return def;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : def;
  });

const optStr = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v : null));

export const quoteLineItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  price_book_item_id: z.string().uuid().nullable().optional().default(null),
  category: optStr,
  name: z.string().trim().min(1, "Each line item needs a name"),
  description: optStr,
  quantity: numv(1),
  unit: optStr,
  material_cost: numv(0),
  labor_minutes: numv(0),
  labor_rate: numv(0),
  markup_percent: numv(0),
  unit_price: numv(0),
  ai_generated: z.boolean().optional().default(false),
  confidence: z.number().min(0).max(1).nullable().optional().default(null),
});
export type QuoteLineItemInput = z.input<typeof quoteLineItemInputSchema>;

export const quoteSaveSchema = z.object({
  title: optStr,
  scope_summary: optStr,
  assumptions: optStr,
  exclusions: optStr,
  valid_until: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v : null)),
  tax_percent: numv(0),
  line_items: z.array(quoteLineItemInputSchema).default([]),
});
export type QuoteSaveInput = z.input<typeof quoteSaveSchema>;

export const quoteStatusSchema = z.enum(QUOTE_STATUSES);

export const generateQuoteSchema = z.object({
  customerId: z.string().uuid().nullable().optional().default(null),
  newCustomer: z
    .object({
      name: z.string().trim().min(1),
      email: z.string().trim().optional(),
      phone: z.string().trim().optional(),
      address: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      postal_code: z.string().trim().optional(),
    })
    .nullable()
    .optional()
    .default(null),
  jobDescription: z.string().trim().min(1, "Describe the job to generate a draft."),
  jobLocation: z.string().trim().optional(),
});
export type GenerateQuoteInput = z.input<typeof generateQuoteSchema>;
