import { z } from "zod";
import { TRADES, CURRENCIES } from "@/lib/constants";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

export const organizationOnboardingSchema = z.object({
  name: z.string().trim().min(1, "Business name is required"),
  ownerName: optionalString,
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")).transform((v) => (v ? v : null)),
  phone: optionalString,
  website: optionalString,
  address: optionalString,
  country: z.string().trim().min(1).default("United States"),
  state: optionalString,
  city: optionalString,
  trade: z.enum(TRADES),
  defaultCurrency: z.enum(CURRENCIES).default("USD"),
  defaultLaborRate: optionalNumber,
  defaultMaterialMarkupPercent: optionalNumber,
  defaultTaxPercent: optionalNumber,
  logoUrl: optionalString,
  proposalFooter: optionalString,
  licenseText: optionalString,
  googleReviewUrl: optionalString,
});

export type OrganizationOnboardingInput = z.input<typeof organizationOnboardingSchema>;
export type OrganizationOnboardingValues = z.output<typeof organizationOnboardingSchema>;
