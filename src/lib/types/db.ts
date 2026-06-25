/**
 * Hand-authored database row types for ServiceQuote AI.
 *
 * These mirror supabase/migrations/0001_init.sql. They are intentionally
 * maintained by hand (rather than `supabase gen types`) so the project type-
 * checks without a live Supabase connection. Keep them in sync with the SQL.
 */
import type {
  OrgRole,
  QuoteStatus,
  AiStatus,
  QuoteEventType,
  PriceBookSource,
  Trade,
  CustomerResponse,
  InvitableRole,
  InvitationStatus,
} from "@/lib/constants";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  owner_id: string;
  name: string;
  trade: Trade;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  default_currency: string;
  default_labor_rate: number | null;
  default_material_markup_percent: number | null;
  default_tax_percent: number | null;
  proposal_footer: string | null;
  license_text: string | null;
  google_review_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceBookItem {
  id: string;
  organization_id: string;
  trade: string | null;
  category: string | null;
  name: string;
  description: string | null;
  unit: string | null;
  default_quantity: number | null;
  material_cost: number | null;
  labor_minutes: number | null;
  markup_percent: number | null;
  price_override: number | null;
  active: boolean;
  source: PriceBookSource;
  created_at: string;
  updated_at: string;
}

export interface QuoteRequest {
  id: string;
  organization_id: string;
  customer_id: string | null;
  raw_input: string | null;
  job_location: string | null;
  uploaded_image_urls: string[] | null;
  ai_status: AiStatus;
  ai_confidence: number | null;
  ai_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  organization_id: string;
  customer_id: string | null;
  quote_request_id: string | null;
  quote_number: string | null;
  title: string | null;
  scope_summary: string | null;
  assumptions: string | null;
  exclusions: string | null;
  status: QuoteStatus;
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  currency: string;
  valid_until: string | null;
  pdf_url: string | null;
  /** Sharing (migration 0005). */
  share_token: string | null;
  shared_at: string | null;
  customer_response: CustomerResponse | null;
  customer_responded_at: string | null;
  customer_view_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItem {
  id: string;
  quote_id: string;
  price_book_item_id: string | null;
  sort_order: number;
  category: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  material_cost: number;
  labor_minutes: number;
  labor_rate: number;
  markup_percent: number;
  unit_price: number;
  total_price: number;
  ai_generated: boolean;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface AiExtractionLog {
  id: string;
  organization_id: string;
  quote_request_id: string | null;
  provider: string;
  model: string | null;
  input_text: string | null;
  output_json: unknown;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface QuoteEvent {
  id: string;
  organization_id: string;
  quote_id: string;
  event_type: QuoteEventType;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: InvitableRole;
  token: string;
  status: InvitationStatus;
  invited_by: string | null;
  accepted_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Quote with its line items joined — the shape the editor and PDF consume. */
export interface QuoteWithLines extends Quote {
  quote_line_items: QuoteLineItem[];
  customer?: Customer | null;
}
