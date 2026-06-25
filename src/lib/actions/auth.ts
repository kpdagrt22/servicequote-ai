"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
