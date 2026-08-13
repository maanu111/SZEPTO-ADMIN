import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ShippingForm } from "./ShippingForm";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { requirePage } from "@/lib/viewer";

export const metadata = { title: "Shipping & charges" };
export const revalidate = 0;

export default async function ShippingSettingsPage() {
  await requirePage("shipping");
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_settings")
    .select("rate_per_kg, service_charge, free_shipping_over, volumetric_divisor, delivery_estimate, whatsapp_number, whatsapp_message")
    .maybeSingle();

  return (
    <>
      <RealtimeRefresh tables={["store_settings"]} />
      <PageHeader
        title="Shipping & charges"
      />
      <ShippingForm
        initial={{
          rate_per_kg: data?.rate_per_kg ?? 300,
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
