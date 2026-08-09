import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { PagesManager, type PageRecord } from "./PagesManager";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";

export const metadata = { title: "Pages" };
export const revalidate = 0;

export default async function PagesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("*")
    .order("group_name")
    .order("sort_order");

  const pages: PageRecord[] = (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    group_name: p.group_name,
    body: p.body,
    sort_order: p.sort_order,
    is_active: p.is_active,
  }));

  return (
    <>
      <RealtimeRefresh tables={["pages"]} />
      <PageHeader title="Pages" />
      <PagesManager pages={pages} />
    </>
  );
}
