import { z } from "zod";

const optStr = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  phone: optStr,
  address: optStr,
  city: optStr,
  state: optStr,
  postal_code: optStr,
  notes: optStr,
});

export type CustomerInput = z.input<typeof customerSchema>;
export type CustomerValues = z.output<typeof customerSchema>;
