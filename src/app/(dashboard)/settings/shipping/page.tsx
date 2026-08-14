import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { RateBands } from "./RateBands";
import { ShippingForm } from "./ShippingForm";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { requirePage } from "@/lib/viewer";

export const metadata = { title: "Delivery & charges" };
export const revalidate = 0;

export default async function ShippingSettingsPage() {
  await requirePage("shipping");
  const supabase = await createClient();
  const { data: rateRows } = await supabase
    .from("shipping_rates")
    .select("id, min_kg, max_kg, price")
    .order("sort_order");

  const { data } = await supabase
    .from("store_settings")
    .select("service_charge, free_shipping_over, volumetric_divisor, delivery_estimate, whatsapp_number, whatsapp_message")
    .maybeSingle();

  return (
    <>
      <RealtimeRefresh tables={["store_settings", "shipping_rates"]} />
      <PageHeader
        title="Delivery & charges"
      />
      <div className="mb-4">
        <RateBands
          initial={(rateRows ?? []).map((r) => ({
            id: r.id,
            min_kg: Number(r.min_kg),
            max_kg: r.max_kg === null ? null : Number(r.max_kg),
            price: r.price,
          }))}
        />
      </div>

      <ShippingForm
        initial={{
          service_charge: data?.service_charge ?? 250,
          free_shipping_over: data?.free_shipping_over ?? 0,
          volumetric_divisor: data?.volumetric_divisor ?? 5000,
          delivery_estimate: data?.delivery_estimate ?? "",
          whatsapp_number: data?.whatsapp_number ?? "",
          whatsapp_message: data?.whatsapp_message ?? "",
        }}
      />
    </>
  );
}
