import { PageHeader } from "@/components/ui";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { createClient } from "@/lib/supabase/server";
import { BannersManager, type BannerRecord } from "./BannersManager";

export const metadata = { title: "Banners" };
export const revalidate = 0;

export default async function BannersPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("banners")
    .select("*")
    .order("sort_order");

  const banners: BannerRecord[] = (data ?? []).map((b) => ({
    id: b.id,
    eyebrow: b.eyebrow ?? "",
    title: b.title,
    body: b.body ?? "",
    cta_label: b.cta_label,
    cta_href: b.cta_href,
    color_from: b.color_from,
    color_to: b.color_to,
    image_url: b.image_url ?? null,
    image_fit: (b.image_fit ?? "right") as "right" | "cover",
    product_slugs: b.product_slugs ?? [],
    sort_order: b.sort_order,
    is_active: b.is_active,
  }));

  return (
    <>
      <RealtimeRefresh tables={["banners"]} />
      <PageHeader
        title="Banners"
        subtitle="Hero slides shown at the top of the storefront home page"
      />
      <BannersManager banners={banners} />
    </>
  );
}
