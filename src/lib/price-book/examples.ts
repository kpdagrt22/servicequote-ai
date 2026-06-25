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
    { category: "Service", name: "Service call / diagnostic", description: "Travel + on-site diagnosis.", unit: "job", default_quantity: 1, material_cost: 0, labor_minutes: 60, markup_percent: 0 },
    { category: "Devices", name: "Install GFCI receptacle", description: "Supply + install GFCI outlet and plate.", unit: "each", default_quantity: 1, material_cost: 18, labor_minutes: 45, markup_percent: 20 },
    { category: "Devices", name: "Install standard outlet", description: "Supply + install duplex receptacle.", unit: "each", default_quantity: 1, material_cost: 6, labor_minutes: 30, markup_percent: 20 },
    { category: "Fixtures", name: "Install light fixture", description: "Mount + wire customer-supplied fixture.", unit: "each", default_quantity: 1, material_cost: 15, labor_minutes: 40, markup_percent: 15 },
    { category: "Fixtures", name: "Install ceiling fan", description: "Assemble, mount + wire ceiling fan.", unit: "each", default_quantity: 1, material_cost: 25, labor_minutes: 90, markup_percent: 15 },
    { category: "Rough-in", name: "Run new 20A circuit", description: "New circuit from panel incl. wire.", unit: "each", default_quantity: 1, material_cost: 60, labor_minutes: 150, markup_percent: 25 },
    { category: "Service", name: "200A panel upgrade", description: "Replace panel, incl. permit coordination.", unit: "job", default_quantity: 1, material_cost: 900, labor_minutes: 480, markup_percent: 20 },
    { category: "Permits", name: "Permit & inspection", description: "Pull permit + schedule inspection.", unit: "job", default_quantity: 1, material_cost: 150, labor_minutes: 30, markup_percent: 0 },
  ],
  hvac: [
    { category: "Service", name: "Diagnostic / service call", description: "Travel + system diagnosis.", unit: "job", default_quantity: 1, material_cost: 0, labor_minutes: 60, markup_percent: 0 },
    { category: "Service", name: "AC/Furnace tune-up", description: "Inspect, clean + tune; replace filter.", unit: "job", default_quantity: 1, material_cost: 25, labor_minutes: 60, markup_percent: 10 },
    { category: "Controls", name: "Smart thermostat install", description: "Install + configure smart thermostat.", unit: "each", default_quantity: 1, material_cost: 120, labor_minutes: 45, markup_percent: 20 },
    { category: "Equipment", name: "Condenser (AC) replacement", description: "Remove + install condenser, refrigerant, startup.", unit: "each", default_quantity: 1, material_cost: 2200, labor_minutes: 360, markup_percent: 18 },
    { category: "Equipment", name: "Furnace replacement", description: "Remove + install furnace incl. connections.", unit: "each", default_quantity: 1, material_cost: 1800, labor_minutes: 360, markup_percent: 18 },
    { category: "Distribution", name: "Ductwork run", description: "Fabricate + install duct/register.", unit: "linear ft", default_quantity: 10, material_cost: 14, labor_minutes: 20, markup_percent: 20 },
    { category: "Equipment", name: "Capacitor replacement", description: "Replace run/start capacitor.", unit: "each", default_quantity: 1, material_cost: 25, labor_minutes: 30, markup_percent: 30 },
  ],
  plumbing: [
    { category: "Service", name: "Service call / diagnostic", description: "Travel + diagnosis.", unit: "job", default_quantity: 1, material_cost: 0, labor_minutes: 60, markup_percent: 0 },
    { category: "Equipment", name: "Water heater replacement", description: "Remove + install 40-50gal heater.", unit: "each", default_quantity: 1, material_cost: 700, labor_minutes: 180, markup_percent: 18 },
    { category: "Fixtures", name: "Faucet replacement", description: "Install customer-supplied faucet.", unit: "each", default_quantity: 1, material_cost: 20, labor_minutes: 60, markup_percent: 20 },
    { category: "Repair", name: "Leak repair", description: "Locate + repair leak incl. fittings.", unit: "job", default_quantity: 1, material_cost: 45, labor_minutes: 90, markup_percent: 25 },
  ],
};

export const EXAMPLE_TRADES = Object.keys(EXAMPLE_PRICE_BOOK) as Trade[];
