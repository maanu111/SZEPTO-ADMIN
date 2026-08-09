"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Change an order's status. RLS restricts this to admins, so a forged request
 * from a signed-out client fails at the database, not just in the UI.
 */
export async function setOrderStatus(
  id: string,
  status: OrderStatus,
  adminNote?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const patch: { status: OrderStatus; admin_note?: string } = { status };
  if (adminNote !== undefined) patch.admin_note = adminNote;

  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function saveAdminNote(id: string, adminNote: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ admin_note: adminNote }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/orders/${id}`);
  return { ok: true };
}
