import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { CategoryManager, type CategoryRecord } from "./CategoryManager";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { requirePage } from "@/lib/viewer";

export const metadata = { title: "Categories" };
export const revalidate = 0;

export default async function CategoriesPage() {
  await requirePage("categories");
  const supabase = await createClient();

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("products").select("category_id"),
  ]);

  const counts = new Map<string, number>();
  for (const p of products ?? []) {
    if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
  }

  const records: CategoryRecord[] = (categories ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    short_name: c.short_name,
    group_name: c.group_name,
    tint: c.tint,
    image_url: c.image_url,
    sort_order: c.sort_order,
    is_active: c.is_active,
    productCount: counts.get(c.id) ?? 0,
  }));

  return (
    <>
      <RealtimeRefresh tables={["categories", "products"]} />
      <PageHeader
        title="Categories"
      />
      <CategoryManager categories={records} />
    </>
  );
}
