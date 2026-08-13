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
  rate_per_kg: number;
  service_charge: number;
  free_shipping_over: number;
  volumetric_divisor: number;
  delivery_estimate: string;
  whatsapp_number: string;
  whatsapp_message: string;
}): Promise<ActionResult> {
  if (input.rate_per_kg < 0 || input.service_charge < 0 || input.free_shipping_over < 0) {
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
