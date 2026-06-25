"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/org";
import { customerSchema } from "@/lib/validation/customer";

export interface CustomerActionResult {
  ok: boolean;
  error?: string;
  customerId?: string;
}

async function ensureEditor() {
  const ctx = await requireOrg();
  if (!ctx.isEditor) throw new Error("You don't have permission to manage customers.");
  return ctx;
}

export async function createCustomer(values: unknown): Promise<CustomerActionResult> {
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };
  const { supabase, organization } = await ensureEditor();
  const { data, error } = await supabase
    .from("customers")
    .insert({ organization_id: organization.id, ...parsed.data })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/customers");
  return { ok: true, customerId: data.id as string };
}

export async function updateCustomer(id: string, values: unknown): Promise<CustomerActionResult> {
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };
  const { supabase, organization } = await ensureEditor();
  const { error } = await supabase
    .from("customers")
    .update(parsed.data)
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/customers");
  return { ok: true, customerId: id };
}

export async function deleteCustomer(id: string): Promise<CustomerActionResult> {
  const { supabase, organization } = await ensureEditor();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/customers");
  return { ok: true };
}
