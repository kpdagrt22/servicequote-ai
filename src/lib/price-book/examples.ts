import type { Trade } from "@/lib/constants";

/**
 * Example price book items used for demos and service-assisted onboarding.
 * The "Load example items" button on the price book page inserts these so a new
 * contractor (or a founder onboarding them) has something to edit immediately.
 * These are STARTING POINTS — every contractor adjusts to their real prices.
 */
export interface ExampleItem {
  category: string;
  name: string;
  description: string;
  unit: string;
  default_quantity: number;
  material_cost: number;
  labor_minutes: number;
  markup_percent: number;
}

export const EXAMPLE_PRICE_BOOK: Partial<Record<Trade, ExampleItem[]>> = {
  electrical: [
    { category: "service_call", name: "Service call / diagnostic", description: "Travel + on-site diagnosis.", unit: "job", default_quantity: 1, material_cost: 0, labor_minutes: 60, markup_percent: 0 },
    { category: "installation", name: "Replace standard outlet", description: "Supply + install duplex receptacle.", unit: "each", default_quantity: 1, material_cost: 6, labor_minutes: 30, markup_percent: 20 },
    { category: "installation", name: "Install GFCI outlet", description: "Supply + install GFCI receptacle and plate.", unit: "each", default_quantity: 1, material_cost: 18, labor_minutes: 45, markup_percent: 20 },
    { category: "installation", name: "Install ceiling fan", description: "Assemble, mount + wire ceiling fan.", unit: "each", default_quantity: 1, material_cost: 25, labor_minutes: 90, markup_percent: 15 },
    { category: "installation", name: "Install recessed light", description: "Cut-in, mount + wire recessed LED.", unit: "each", default_quantity: 1, material_cost: 22, labor_minutes: 45, markup_percent: 15 },
    { category: "repair", name: "Replace breaker", description: "Replace standard single-pole breaker.", unit: "each", default_quantity: 1, material_cost: 35, labor_minutes: 45, markup_percent: 20 },
    { category: "installation", name: "Add dedicated circuit", description: "New dedicated 20A circuit from panel incl. wire.", unit: "each", default_quantity: 1, material_cost: 60, labor_minutes: 150, markup_percent: 25 },
    { category: "inspection", name: "Panel inspection", description: "Inspect panel, breakers + connections; report.", unit: "job", default_quantity: 1, material_cost: 0, labor_minutes: 45, markup_percent: 0 },
    { category: "permit", name: "Permit allowance", description: "Permit + inspection coordination (verify local fees).", unit: "job", default_quantity: 1, material_cost: 150, labor_minutes: 30, markup_percent: 0 },
  ],
  hvac: [
    { category: "service_call", name: "Diagnostic visit", description: "Travel + system diagnosis.", unit: "job", default_quantity: 1, material_cost: 0, labor_minutes: 60, markup_percent: 0 },
    { category: "installation", name: "Thermostat replacement", description: "Install + configure thermostat.", unit: "each", default_quantity: 1, material_cost: 120, labor_minutes: 45, markup_percent: 20 },
    { category: "materials", name: "Filter replacement", description: "Supply + install standard filter.", unit: "each", default_quantity: 1, material_cost: 18, labor_minutes: 15, markup_percent: 25 },
    { category: "repair", name: "Capacitor replacement", description: "Replace run/start capacitor.", unit: "each", default_quantity: 1, material_cost: 25, labor_minutes: 30, markup_percent: 30 },
    { category: "inspection", name: "Refrigerant leak inspection", description: "Leak search + pressure check; report.", unit: "job", default_quantity: 1, material_cost: 0, labor_minutes: 75, markup_percent: 0 },
    { category: "installation", name: "Mini split installation (placeholder)", description: "Single-zone mini split install — confirm scope + equipment.", unit: "job", default_quantity: 1, material_cost: 1800, labor_minutes: 480, markup_percent: 18 },
    { category: "inspection", name: "Furnace tune-up", description: "Inspect, clean + tune furnace.", unit: "job", default_quantity: 1, material_cost: 15, labor_minutes: 60, markup_percent: 10 },
    { category: "inspection", name: "AC tune-up", description: "Inspect, clean + tune AC; check charge.", unit: "job", default_quantity: 1, material_cost: 15, labor_minutes: 60, markup_percent: 10 },
    { category: "inspection", name: "Duct inspection", description: "Inspect ductwork for leaks + airflow; report.", unit: "job", default_quantity: 1, material_cost: 0, labor_minutes: 45, markup_percent: 0 },
  ],
  plumbing: [
    { category: "Service", name: "Service call / diagnostic", description: "Travel + diagnosis.", unit: "job", default_quantity: 1, material_cost: 0, labor_minutes: 60, markup_percent: 0 },
    { category: "Equipment", name: "Water heater replacement", description: "Remove + install 40-50gal heater.", unit: "each", default_quantity: 1, material_cost: 700, labor_minutes: 180, markup_percent: 18 },
    { category: "Fixtures", name: "Faucet replacement", description: "Install customer-supplied faucet.", unit: "each", default_quantity: 1, material_cost: 20, labor_minutes: 60, markup_percent: 20 },
    { category: "Repair", name: "Leak repair", description: "Locate + repair leak incl. fittings.", unit: "job", default_quantity: 1, material_cost: 45, labor_minutes: 90, markup_percent: 25 },
  ],
};

export const EXAMPLE_TRADES = Object.keys(EXAMPLE_PRICE_BOOK) as Trade[];
