import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "@/components/icons";
import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../ProductForm";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { requirePage } from "@/lib/viewer";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Product" };
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePage("products");
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }, { data: variants }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", id)
      .order("sort_order"),
  ]);

  if (!product) notFound();

  return (
    <>
      <RealtimeRefresh tables={["products", "product_variants"]} />
      <Link
        href="/products"
        className="mb-3 inline-flex items-center gap-1 text-[12px] font-semibold text-text-dim transition-colors hover:text-text-hi"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Products
      </Link>

      <PageHeader
        title={product.name}
        subtitle={`/product/${product.slug}`}
      />

      <ProductForm
        productId={product.id}
        categories={categories ?? []}
        initial={{
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          category_id: product.category_id,
          description: product.description,
          unit: product.unit,
          stock: product.stock,
          rating: product.rating,
          image_url: product.image_url,
          tags: product.tags ?? [],
          shipping_info: product.shipping_info,
          return_policy: product.return_policy,
          is_active: product.is_active,
        }}
        initialVariants={(variants ?? []).map((v) => ({
          id: v.id,
          label: v.label,
          unit: v.unit,
          price: v.price,
          mrp: v.mrp,
          weight_kg: Number(v.weight_kg),
          in_stock: v.in_stock,
          is_default: v.is_default,
        }))}
      />
    </>
  );
}
