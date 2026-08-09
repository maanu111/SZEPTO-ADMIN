"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Change an order's status.
 *
 * Runs as a server action behind the admin session check in middleware, which
 * is what gates it — the database itself is deliberately open.
 */
export async function setOrderStatus(
  id: string,
  status: OrderStatus,
  adminNote?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const patch: {
    status: OrderStatus;
    admin_note?: string;
    shipped_at?: string | null;
    delivered_at?: string | null;
  } = { status };
  if (adminNote !== undefined) patch.admin_note = adminNote;

  // Stamp when each fulfilment step happened, and clear it again if the admin
  // walks the order back — a delivered_at on a "confirmed" order would be a lie.
  const now = new Date().toISOString();
  if (status === "shipped") {
    patch.shipped_at = now;
    patch.delivered_at = null;
  } else if (status === "delivered") {
    patch.delivered_at = now;
  } else {
    patch.shipped_at = null;
    patch.delivered_at = null;
  }

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
