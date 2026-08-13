"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database, StaffRow } from "@/lib/database.types";
import { ALL_PAGE_KEYS, type PageKey } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Service-role client.
 *
 * Creating a login means writing to Supabase Auth, which the anon key cannot do.
 * This never reaches the browser — the file is server-only.
 */
function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Every mutation here is owner-only, checked server-side, not just hidden in the UI. */
async function requireOwner(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Not signed in." };
  if (!viewer.isOwner) return { ok: false, error: "Only the owner can manage staff." };
  return { ok: true };
}

function cleanPages(pages: string[]): PageKey[] {
  return pages.filter((p): p is PageKey => (ALL_PAGE_KEYS as string[]).includes(p));
}

export async function createStaff(input: {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  allowed_pages: string[];
}): Promise<ActionResult> {
  const guard = await requireOwner();
  if (!guard.ok) return guard;

  const name = input.full_name.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();

  if (name.length < 2) return { ok: false, error: "Enter the staff member's name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Enter a valid email." };
  if (input.password.length < 8)
    return { ok: false, error: "Password must be at least 8 characters." };
  if (!/^\+?[\d\s-]{7,15}$/.test(phone)) return { ok: false, error: "Enter a valid phone number." };

  const admin = adminClient();
  if (!admin) return { ok: false, error: "Server is missing its service key." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("staff")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) return { ok: false, error: "Someone already uses that email." };

  // The Auth user comes first: if the staff row saved but the login failed,
  // the owner would see an account that can never sign in.
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });
  if (authError || !created?.user) {
    return { ok: false, error: authError?.message ?? "Could not create the login." };
  }

  const { error } = await supabase.from("staff").insert({
    email,
    full_name: name,
    phone,
    role: "staff",
    is_active: true,
    auth_user_id: created.user.id,
    allowed_pages: cleanPages(input.allowed_pages),
  });

  if (error) {
    // Roll the login back so a retry is not blocked by a half-made account.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: error.message };
  }

  revalidatePath("/staff");
  return { ok: true };
}

export async function updateStaff(
  id: string,
  patch: { full_name?: string; phone?: string; allowed_pages?: string[]; is_active?: boolean }
): Promise<ActionResult> {
  const guard = await requireOwner();
  if (!guard.ok) return guard;

  const supabase = await createClient();
  const { data: target } = await supabase.from("staff").select("role").eq("id", id).maybeSingle();
  if (target?.role === "owner") return { ok: false, error: "The owner account can't be changed here." };

  const update: Partial<StaffRow> = { updated_at: new Date().toISOString() };
  if (patch.full_name !== undefined) update.full_name = patch.full_name.trim();
  if (patch.phone !== undefined) update.phone = patch.phone.trim();
  if (patch.allowed_pages !== undefined) update.allowed_pages = cleanPages(patch.allowed_pages);
  if (patch.is_active !== undefined) update.is_active = patch.is_active;

  const { error } = await supabase.from("staff").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/staff");
  return { ok: true };
}

export async function resetStaffPassword(id: string, password: string): Promise<ActionResult> {
  const guard = await requireOwner();
  if (!guard.ok) return guard;
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

  const admin = adminClient();
  if (!admin) return { ok: false, error: "Server is missing its service key." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("staff")
    .select("auth_user_id, role")
    .eq("id", id)
    .maybeSingle();
  if (row?.role === "owner") return { ok: false, error: "Change the owner password in Supabase." };
  if (!row?.auth_user_id) return { ok: false, error: "This account has no login attached." };

  const { error } = await admin.auth.admin.updateUserById(row.auth_user_id, { password });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function deleteStaff(id: string): Promise<ActionResult> {
  const guard = await requireOwner();
  if (!guard.ok) return guard;

  const admin = adminClient();
  if (!admin) return { ok: false, error: "Server is missing its service key." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("staff")
    .select("auth_user_id, role")
    .eq("id", id)
    .maybeSingle();
  if (row?.role === "owner") return { ok: false, error: "The owner account can't be removed." };

  const { error } = await supabase.from("staff").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Remove the login too, otherwise the password keeps working against a
  // staff row that no longer exists.
  if (row?.auth_user_id) await admin.auth.admin.deleteUser(row.auth_user_id);

  revalidatePath("/staff");
  return { ok: true };
}
