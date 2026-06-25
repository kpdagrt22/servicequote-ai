import {
  quoteExtractionSchema,
  type ExtractQuoteRequest,
  type QuoteExtraction,
  type SuggestedLineItem,
} from "@/lib/ai/schemas/quote-extraction";
import { findBestMatch } from "@/lib/price-book/matching";

/**
 * Deterministic mock AI provider.
 *
 * Produces a believable, schema-valid quote extraction with NO external API
 * call, so the whole product works end-to-end during validation and demos. The
 * logic is rule-based: a small trade-aware keyword library turns the job notes
 * into line items, and the contractor's price book is matched by token overlap.
 * Nothing here is random — tests assert exact behaviour.
 */

interface Rule {
  /** Keywords that, if present in the job notes, trigger this line item. */
  match: string[];
  item: Omit<SuggestedLineItem, "matched_price_book_item_id" | "confidence" | "reason"> & {
    confidence?: number;
  };
}

const SHARED_RULES: Rule[] = [
  {
    match: ["permit", "inspection"],
    item: {
      category: "Permits",
      name: "Permit & inspection fee",
      description: "Pull permit and schedule inspection as required by local code.",
      quantity: 1,
      unit: "job",
      suggested_material_cost: 150,
      suggested_labor_minutes: 30,
    },
  },
  {
    match: ["trip", "service call", "diagnos", "assess"],
    item: {
      category: "Labor",
      name: "Service call / diagnostic",
      description: "Travel, on-site assessment, and diagnosis.",
      quantity: 1,
      unit: "job",
      suggested_material_cost: 0,
      suggested_labor_minutes: 60,
    },
  },
];

const TRADE_RULES: Record<string, Rule[]> = {
  electrical: [
    {
      match: ["outlet", "receptacle", "gfci"],
      item: {
        category: "Devices",
        name: "Install outlet / GFCI receptacle",
        description: "Supply and install receptacle, including device and cover plate.",
        quantity: 1,
        unit: "each",
        suggested_material_cost: 18,
        suggested_labor_minutes: 45,
      },
    },
    {
      match: ["panel", "breaker", "service upgrade", "200 amp", "100 amp"],
      item: {
        category: "Service",
        name: "Electrical panel / breaker work",
        description: "Panel or breaker work including labor and materials.",
        quantity: 1,
        unit: "job",
        suggested_material_cost: 350,
        suggested_labor_minutes: 240,
      },
    },
    {
      match: ["light", "fixture", "ceiling fan", "recessed", "can light"],
      item: {
        category: "Fixtures",
        name: "Install light fixture",
        description: "Mount and wire fixture provided or supplied.",
        quantity: 1,
        unit: "each",
        suggested_material_cost: 25,
        suggested_labor_minutes: 40,
      },
    },
    {
      match: ["wire", "wiring", "circuit", "romex"],
      item: {
        category: "Rough-in",
        name: "Run new circuit / wiring",
        description: "Run new circuit from panel including wire and conduit as needed.",
        quantity: 1,
        unit: "each",
        suggested_material_cost: 60,
        suggested_labor_minutes: 120,
      },
    },
  ],
  hvac: [
    {
      match: ["furnace", "heater", "heating"],
      item: {
        category: "Equipment",
        name: "Furnace install / replacement",
        description: "Remove old unit and install new furnace including connections.",
        quantity: 1,
        unit: "each",
        suggested_material_cost: 1800,
        suggested_labor_minutes: 360,
      },
    },
    {
      match: ["ac", "a/c", "air conditioner", "condenser", "cooling"],
      item: {
        category: "Equipment",
        name: "AC condenser install / replacement",
        description: "Install condenser unit including refrigerant and startup.",
        quantity: 1,
        unit: "each",
        suggested_material_cost: 2200,
        suggested_labor_minutes: 360,
      },
    },
    {
      match: ["thermostat"],
      item: {
        category: "Controls",
        name: "Smart thermostat install",
        description: "Install and configure programmable/smart thermostat.",
        quantity: 1,
        unit: "each",
        suggested_material_cost: 120,
        suggested_labor_minutes: 45,
      },
    },
    {
      match: ["duct", "ductwork", "vent"],
      item: {
        category: "Distribution",
        name: "Ductwork / vent run",
        description: "Fabricate and install duct run or register.",
        quantity: 1,
        unit: "linear ft",
        suggested_material_cost: 14,
        suggested_labor_minutes: 20,
      },
    },
    {
      match: ["tune", "maintenance", "clean", "filter"],
      item: {
        category: "Service",
        name: "System tune-up",
        description: "Inspect, clean, and tune HVAC system; replace filter.",
        quantity: 1,
        unit: "job",
        suggested_material_cost: 25,
        suggested_labor_minutes: 60,
      },
    },
  ],
  plumbing: [
    {
      match: ["water heater", "tank"],
      item: {
        category: "Equipment",
        name: "Water heater install / replacement",
        description: "Remove old heater and install new unit with connections.",
        quantity: 1,
        unit: "each",
        suggested_material_cost: 700,
        suggested_labor_minutes: 180,
      },
    },
    {
      match: ["leak", "pipe", "repipe"],
      item: {
        category: "Repair",
        name: "Pipe repair / leak fix",
        description: "Locate and repair leak including fittings.",
        quantity: 1,
        unit: "job",
        suggested_material_cost: 45,
        suggested_labor_minutes: 90,
      },
    },
    {
      match: ["faucet", "fixture", "toilet", "sink"],
      item: {
        category: "Fixtures",
        name: "Fixture install (faucet / toilet / sink)",
        description: "Install customer- or contractor-supplied fixture.",
        quantity: 1,
        unit: "each",
        suggested_material_cost: 35,
        suggested_labor_minutes: 75,
      },
    },
  ],
  roofing: [
    {
      match: ["shingle", "reroof", "re-roof", "roof replace"],
      item: {
        category: "Roofing",
        name: "Asphalt shingle roof (per square)",
        description: "Tear-off and install architectural shingles, per 100 sq ft.",
        quantity: 10,
        unit: "sq ft",
        suggested_material_cost: 120,
        suggested_labor_minutes: 90,
      },
    },
    {
      match: ["leak", "flashing", "repair"],
      item: {
        category: "Repair",
        name: "Roof leak / flashing repair",
        description: "Repair localized leak and reseal flashing.",
        quantity: 1,
        unit: "job",
        suggested_material_cost: 60,
        suggested_labor_minutes: 120,
      },
    },
  ],
  landscaping: [
    {
      match: ["mulch", "bed"],
      item: {
        category: "Materials",
        name: "Mulch installation",
        description: "Supply and spread mulch in beds, per cubic yard.",
        quantity: 1,
        unit: "unit",
        suggested_material_cost: 45,
        suggested_labor_minutes: 30,
      },
    },
    {
      match: ["sod", "lawn", "grass"],
      item: {
        category: "Turf",
        name: "Sod installation",
        description: "Grade and lay sod, per sq ft.",
        quantity: 100,
        unit: "sq ft",
        suggested_material_cost: 0.8,
        suggested_labor_minutes: 1,
      },
    },
    {
      match: ["tree", "shrub", "plant", "trim"],
      item: {
        category: "Planting",
        name: "Planting / trimming labor",
        description: "Plant or trim shrubs and trees.",
        quantity: 2,
        unit: "hour",
        suggested_material_cost: 0,
        suggested_labor_minutes: 60,
      },
    },
  ],
  handyman: [
    {
      match: ["drywall", "patch", "hole"],
      item: {
        category: "Repair",
        name: "Drywall patch & paint",
        description: "Patch, sand, and paint drywall to match.",
        quantity: 1,
        unit: "job",
        suggested_material_cost: 30,
        suggested_labor_minutes: 90,
      },
    },
    {
      match: ["mount", "tv", "shelf", "hang"],
      item: {
        category: "Install",
        name: "Mount / hang item",
        description: "Mount TV, shelf, or fixture securely to wall.",
        quantity: 1,
        unit: "each",
        suggested_material_cost: 15,
        suggested_labor_minutes: 45,
      },
    },
    {
      match: ["door", "handle", "lock"],
      item: {
        category: "Doors",
        name: "Door / hardware install",
        description: "Install or adjust door, handle, or lock.",
        quantity: 1,
        unit: "each",
        suggested_material_cost: 40,
        suggested_labor_minutes: 60,
      },
    },
  ],
};

function buildLineItems(req: ExtractQuoteRequest): SuggestedLineItem[] {
  const notes = req.jobDescription.toLowerCase();
  const rules = [...(TRADE_RULES[req.context.trade] ?? []), ...SHARED_RULES];

  const items: SuggestedLineItem[] = [];
  const seen = new Set<string>();

  for (const rule of rules) {
    if (!rule.match.some((kw) => notes.includes(kw))) continue;
    if (seen.has(rule.item.name)) continue;
    seen.add(rule.item.name);

    const match = findBestMatch(
      `${rule.item.name} ${rule.item.description ?? ""}`,
      req.priceBook
    );

    items.push({
      category: rule.item.category ?? null,
      name: rule.item.name,
      description: rule.item.description ?? null,
      quantity: rule.item.quantity ?? 1,
      unit: match?.item.unit ?? rule.item.unit ?? "each",
      matched_price_book_item_id: match?.item.id ?? null,
      suggested_material_cost:
        match?.item.material_cost ?? rule.item.suggested_material_cost ?? null,
      suggested_labor_minutes:
        match?.item.labor_minutes ?? rule.item.suggested_labor_minutes ?? null,
      confidence: match ? 0.85 : rule.item.confidence ?? 0.65,
      reason: match
        ? `Matched to your price book item "${match.item.name}".`
        : "Inferred from your job notes — review the price.",
    });
  }

  // Always give the contractor something to edit, even with vague notes.
  if (items.length === 0) {
    items.push({
      category: "Labor",
      name: "General labor",
      description: "Estimated labor for the described work. Adjust to fit the job.",
      quantity: 2,
      unit: "hour",
      matched_price_book_item_id: null,
      suggested_material_cost: 0,
      suggested_labor_minutes: 60,
      confidence: 0.4,
      reason: "Could not infer specific tasks — added a labor placeholder.",
    });
  }

  return items;
}

export function mockExtractQuote(req: ExtractQuoteRequest): QuoteExtraction {
  const items = buildLineItems(req);
  const matchedCount = items.filter((i) => i.matched_price_book_item_id).length;
  const avgConfidence =
    items.reduce((s, i) => s + i.confidence, 0) / Math.max(1, items.length);

  const firstLine = req.jobDescription.trim().split(/[.\n]/)[0]?.trim() || "service work";
  const tradeLabel = req.context.trade;

  const extraction = {
    job_type: tradeLabel.charAt(0).toUpperCase() + tradeLabel.slice(1) + " job",
    scope_summary: `Based on the notes: ${firstLine}. This draft breaks the work into ${items.length} line item${
      items.length === 1 ? "" : "s"
    } for your review.`,
    assumptions: [
      "Work performed during normal business hours.",
      "Standard access to the work area is available.",
      req.context.defaultLaborRate != null
        ? `Labor billed at $${req.context.defaultLaborRate}/hour.`
        : "Labor rate to be confirmed from your settings.",
    ],
    exclusions: [
      "Repairs to pre-existing conditions not described in the job notes.",
      "Permit fees unless listed as a line item.",
    ],
    suggested_line_items: items,
    risk_flags: [
      "Confirm site conditions match the description before committing to this price.",
      matchedCount < items.length
        ? "Some items were not matched to your price book — verify those prices."
        : "All items matched your price book.",
    ],
    questions_for_contractor: [
      "Are materials customer-supplied or included?",
      "Is this a single visit or does it require a return trip?",
    ],
    confidence: Number(avgConfidence.toFixed(2)),
  };

  // Validate our own output through the same gate real providers pass through.
  return quoteExtractionSchema.parse(extraction);
}
