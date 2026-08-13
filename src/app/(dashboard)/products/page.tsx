import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { LinkButton, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { BulkGrid, type GridRow } from "./BulkGrid";
import { ImportClient } from "./ImportClient";
import { ProductsTable, type ProductRowView } from "./ProductsTable";
import { requirePage } from "@/lib/viewer";

export const metadata = { title: "Products" };
export const revalidate = 0;

const PAGE_SIZE = 40;

const SECTIONS = [
  { key: "list", label: "All products" },
  { key: "import", label: "Import" },
  { key: "bulk", label: "Bulk edit" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    q?: string;
    category?: string;
    status?: string;
    stock?: string;
    page?: string;
  }>;
}) {
  await requirePage("products");
  const {
    view = "list",
    q = "",
    category = "",
    status = "all",
    stock = "all",
    page = "1",
  } = await searchParams;
  const section: SectionKey = SECTIONS.some((s) => s.key === view) ? (view as SectionKey) : "list";
  const pageNum = Math.max(1, Number(page) || 1);
  const term = q.trim();

  const supabase = await createClient();
  const { data: categoryRows } = await supabase
    .from("categories")
    .select("id, slug, name")
    .order("sort_order");
  const categories = categoryRows ?? [];
  const categorySlug = new Map(categories.map((c) => [c.id, c.slug]));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  /* ---- All products ---- */
  let listProducts: ProductRowView[] = [];
  let total = 0;
  let pages = 1;

  if (section === "list") {
    const from = (pageNum - 1) * PAGE_SIZE;
    let query = supabase
      .from("products")
      .select("id, slug, name, brand, image_url, stock, is_active, category_id", {
        count: "exact",
      })
      .order("sort_order")
      .range(from, from + PAGE_SIZE - 1);

    if (term) query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%,brand.ilike.%${term}%`);
    if (category) {
      const match = categories.find((c) => c.slug === category);
      if (match) query = query.eq("category_id", match.id);
    }
    if (status === "live") query = query.eq("is_active", true);
    if (status === "hidden") query = query.eq("is_active", false);
    if (stock === "out") query = query.lte("stock", 0);
    if (stock === "low") query = query.gt("stock", 0).lte("stock", 10);

    const { data, count } = await query;
    const rows = data ?? [];
    total = count ?? 0;
    pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const { data: variants } = rows.length
      ? await supabase
          .from("product_variants")
          .select("product_id, price, is_default, sort_order")
          .in(
            "product_id",
            rows.map((p) => p.id)
          )
          .order("sort_order")
      : { data: [] };

    const packsByProduct = new Map<string, { price: number; is_default: boolean }[]>();
    for (const v of variants ?? []) {
      const list = packsByProduct.get(v.product_id) ?? [];
      list.push({ price: v.price, is_default: v.is_default });
      packsByProduct.set(v.product_id, list);
    }

    listProducts = rows.map((p) => {
      const packs = packsByProduct.get(p.id) ?? [];
      const primary = packs.find((v) => v.is_default) ?? packs[0];
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        image_url: p.image_url,
        stock: p.stock,
        is_active: p.is_active,
        category: categoryName.get(p.category_id ?? "") ?? "",
        packs: packs.length,
        price: primary?.price ?? null,
      };
    });
  }

  /* ---- Bulk edit ---- */
  let gridRows: GridRow[] = [];

  if (section === "bulk") {
    const { data: all } = await supabase
      .from("products")
      .select("id, slug, name, brand, unit, stock, is_active, category_id")
      .order("sort_order");
    const rows = all ?? [];

    const { data: variants } = rows.length
      ? await supabase
          .from("product_variants")
          .select("product_id, price, is_default, sort_order")
          .in(
            "product_id",
            rows.map((p) => p.id)
          )
          .order("sort_order")
      : { data: [] };

    const priceByProduct = new Map<string, number>();
    for (const v of variants ?? []) {
      if (!priceByProduct.has(v.product_id) || v.is_default) {
        priceByProduct.set(v.product_id, v.price);
      }
    }

    gridRows = rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category: categorySlug.get(p.category_id ?? "") ?? "",
      unit: p.unit,
      stock: p.stock,
      price: priceByProduct.get(p.id) ?? 0,
      is_active: p.is_active,
    }));
  }

  return (
    <>
      <RealtimeRefresh tables={["products", "product_variants", "categories"]} />

      <PageHeader
        title="Products"
        action={
          <LinkButton href="/products/new" variant="primary">
            <PlusIcon className="h-3.5 w-3.5" />
            New product
          </LinkButton>
        }
      />

      {/* Section switcher — a quiet underline rather than a boxed tab bar */}
      <nav className="mb-4 flex gap-5 border-b border-line-soft">
        {SECTIONS.map((s) => {
          const active = s.key === section;
          return (
            <Link
              key={s.key}
              href={s.key === "list" ? "/products" : `/products?view=${s.key}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b pb-2 text-[12px] transition-colors ${
                active
                  ? "border-text-hi font-medium text-text-hi"
                  : "border-transparent text-text-dim hover:text-text-hi"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>

      {section === "list" && (
        <ProductsTable
          products={listProducts}
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          term={term}
          category={category}
          status={status}
          stock={stock}
          page={pageNum}
          pages={pages}
          total={total}
        />
      )}

      {section === "import" && <ImportClient categorySlugs={categories.map((c) => c.slug)} />}

      {section === "bulk" && <BulkGrid initial={gridRows} />}
    </>
  );
}
