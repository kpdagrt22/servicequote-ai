import { z } from "zod";

/** Non-negative number with a default; rejects negatives with a clear message. */
const nonNegNum = (label: string, def = 0) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return def;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : def;
    })
    .refine((n) => n >= 0, `${label} cannot be negative`);

/** Optional non-negative number (null when blank). */
const optNonNegNum = (label: string) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    })
    .refine((n) => n === null || n >= 0, `${label} cannot be negative`);

const optStr = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

/** Unit is required for a price book item; defaults to "each" when blank. */
const unitField = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : "each"));

export const priceBookItemSchema = z.object({
  category: optStr,
  name: z.string().trim().min(1, "Name is required"),
  description: optStr,
  unit: unitField,
  default_quantity: nonNegNum("Default quantity", 1),
  material_cost: nonNegNum("Material cost", 0),
  labor_minutes: nonNegNum("Labor minutes", 0),
  markup_percent: nonNegNum("Markup", 0),
  price_override: optNonNegNum("Price override"),
  active: z.boolean().default(true),
});

export type PriceBookItemInput = z.input<typeof priceBookItemSchema>;
export type PriceBookItemValues = z.output<typeof priceBookItemSchema>;
