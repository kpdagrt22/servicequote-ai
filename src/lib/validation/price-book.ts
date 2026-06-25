import { z } from "zod";

const num = (def = 0) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return def;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : def;
    });

const optNum = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

const optStr = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

export const priceBookItemSchema = z.object({
  category: optStr,
  name: z.string().trim().min(1, "Name is required"),
  description: optStr,
  unit: optStr,
  default_quantity: num(1),
  material_cost: num(0),
  labor_minutes: num(0),
  markup_percent: num(0),
  price_override: optNum,
  active: z.boolean().default(true),
});

export type PriceBookItemInput = z.input<typeof priceBookItemSchema>;
export type PriceBookItemValues = z.output<typeof priceBookItemSchema>;
