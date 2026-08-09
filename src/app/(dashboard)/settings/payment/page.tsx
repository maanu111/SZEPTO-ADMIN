import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { PaymentForm } from "./PaymentForm";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";

export const metadata = { title: "Payment QR" };
export const revalidate = 0;

export default async function PaymentSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_settings")
    .select("qr_url, upi_id, payee_name, payment_note")
    .maybeSingle();

  return (
    <>
      <RealtimeRefresh tables={["store_settings"]} />
      <PageHeader
        title="Payment QR"
      />
      <PaymentForm
        initial={{
          qr_url: data?.qr_url ?? null,
          upi_id: data?.upi_id ?? "",
          payee_name: data?.payee_name ?? "SZepto Retail",
          payment_note: data?.payment_note ?? "",
        }}
      />
    </>
  );
}
