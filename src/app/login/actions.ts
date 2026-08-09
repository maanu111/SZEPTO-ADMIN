"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * This dashboard is single-operator by design: exactly one owner account exists.
 * The login screen uses this to decide between first-run setup and normal sign-in.
 */
export async function adminExists(): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_admin", true);

  return (count ?? 0) > 0;
}

export type SetupResult = { ok: true } | { ok: false; error: string };

/** Claims the single owner account. Refuses once one already exists. */
export async function claimOwnerAccount(userId: string, email: string): Promise<SetupResult> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_admin", true);

  if ((count ?? 0) > 0) {
    return { ok: false, error: "An owner account already exists for this store." };
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, email, is_admin: true }, { onConflict: "id" });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
