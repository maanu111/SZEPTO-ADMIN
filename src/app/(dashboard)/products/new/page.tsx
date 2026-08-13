import Link from "next/link";
import { ChevronLeft } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../ProductForm";
import { requirePage } from "@/lib/viewer";

export const metadata = { title: "New product" };
export const revalidate = 0;

export default async function NewProductPage() {
  await requirePage("products");
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("sort_order");

  return (
    <>
      <Link
        href="/products"
        className="mb-3 inline-flex items-center gap-1 text-[12px] font-semibold text-text-dim transition-colors hover:text-text-hi"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Products
      </Link>

      <PageHeader title="New product" subtitle="Add an item to the catalog" />

      <ProductForm
        categories={categories ?? []}
        initial={{
          slug: "",
          name: "",
          brand: "SZepto Select",
          category_id: categories?.[0]?.id ?? null,
          description: "",
          unit: "1 kg",
          stock: 100,
          rating: 0,
          image_url: null,
          tags: [],
          shipping_info: null,
          return_policy: null,
          is_active: true,
        }}
        initialVariants={[]}
      />
    </>
  );
}
