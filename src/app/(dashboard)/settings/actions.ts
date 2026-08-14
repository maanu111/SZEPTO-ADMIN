"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function savePaymentSettings(input: {
  qr_url: string | null;
  upi_id: string;
  payee_name: string;
  payment_note: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("store_settings").update(input).eq("id", true);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/payment");
  revalidatePath("/");
  return { ok: true };
}

export async function saveShippingSettings(input: {
  service_charge: number;
  free_shipping_over: number;
  volumetric_divisor: number;
  delivery_estimate: string;
  whatsapp_number: string;
  whatsapp_message: string;
}): Promise<ActionResult> {
  if (input.service_charge < 0 || input.free_shipping_over < 0) {
    return { ok: false, error: "Charges can't be negative." };
  }
  // Dividing by zero would make every parcel infinitely heavy.
  if (input.volumetric_divisor < 1) {
    return { ok: false, error: "Volumetric divisor must be at least 1." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("store_settings").update(input).eq("id", true);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/shipping");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Replace the weight bands wholesale.
 *
 * Rewriting the set is simpler and safer than diffing it: a partial update
 * could leave a gap between two bands, and a gap means an order that matches
 * no band at all.
 */
export async function saveShippingRates(
  bands: { min_kg: number; max_kg: number | null; price: number; sort_order: number }[]
): Promise<ActionResult> {
  if (bands.length === 0) return { ok: false, error: "Keep at least one band." };

  for (const b of bands) {
    if (b.price < 0) return { ok: false, error: "A band can't cost less than nothing." };
    if (b.max_kg !== null && b.max_kg <= b.min_kg) {
      return { ok: false, error: "Each band must end above where it starts." };
    }
  }
  if (bands.slice(0, -1).some((b) => b.max_kg === null)) {
    return { ok: false, error: "Only the last band can be left open-ended." };
  }

  const supabase = await createClient();

  const { error: clearError } = await supabase
    .from("shipping_rates")
    .delete()
    .gte("price", -1); // deletes every row; PostgREST refuses an unfiltered delete
  if (clearError) return { ok: false, error: clearError.message };

  const { error } = await supabase.from("shipping_rates").insert(bands);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/shipping");
  return { ok: true };
}
