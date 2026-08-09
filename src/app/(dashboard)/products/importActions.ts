"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ImportPack = {
  label: string;
  unit: string;
  price: number;
  mrp: number;
  weight_kg: number;
};

export type ImportProduct = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  description: string;
  stock: number;
  rating: number;
  image_url: string | null;
  tags: string[];
  is_active: boolean;
  packs: ImportPack[];
};

export type ImportResult =
  | { ok: true; created: number; updated: number }
  | { ok: false; error: string };

/**
 * Upserts a batch of products and replaces their packs.
 *
 * Runs as one pass rather than per-row so a 500-product sheet is a handful of
 * round trips, not a thousand.
 */
export async function importProducts(rows: ImportProduct[]): Promise<ImportResult> {
  if (rows.length === 0) return { ok: false, error: "Nothing to import." };

  const supabase = await createClient();

  // Resolve category slugs up front.
  const { data: categories } = await supabase.from("categories").select("id, slug");
  const categoryBySlug = new Map((categories ?? []).map((c) => [c.slug, c.id]));

  // Which slugs already exist? Drives the created/updated counts.
  const slugs = rows.map((r) => r.slug);
  const { data: existing } = await supabase.from("products").select("slug").in("slug", slugs);
  const existingSlugs = new Set((existing ?? []).map((p) => p.slug));

  const { data: upserted, error: upsertError } = await supabase
    .from("products")
    .upsert(
      rows.map((r, i) => ({
        slug: r.slug,
        name: r.name,
        brand: r.brand,
        category_id: categoryBySlug.get(r.category) ?? null,
        description: r.description,
        unit: r.unit,
        stock: r.stock,
        rating: r.rating,
        image_url: r.image_url,
        images: r.image_url ? [r.image_url] : [],
        tags: r.tags,
        is_active: r.is_active,
        sort_order: i,
      })),
      { onConflict: "slug" }
    )
    .select("id, slug");

  if (upsertError) return { ok: false, error: upsertError.message };

  const idBySlug = new Map((upserted ?? []).map((p) => [p.slug, p.id]));
  const productIds = Array.from(idBySlug.values());

  // Packs are replaced wholesale — the sheet is the source of truth.
  if (productIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("product_variants")
      .delete()
      .in("product_id", productIds);
    if (deleteError) return { ok: false, error: deleteError.message };
  }

  const variants = rows.flatMap((r) => {
    const productId = idBySlug.get(r.slug);
    if (!productId) return [];
    return r.packs.map((p, i) => ({
      product_id: productId,
      label: p.label,
      unit: p.unit,
      price: Math.round(p.price),
      mrp: Math.round(Math.max(p.mrp, p.price)),
      weight_kg: p.weight_kg,
      in_stock: true,
      is_default: i === 0,
      sort_order: i,
    }));
  });

  if (variants.length > 0) {
    const { error: variantError } = await supabase.from("product_variants").insert(variants);
    if (variantError) return { ok: false, error: variantError.message };
  }

  revalidatePath("/products");

  const created = rows.filter((r) => !existingSlugs.has(r.slug)).length;
  return { ok: true, created, updated: rows.length - created };
}

/** Applies edits from the bulk grid. Only the rows that actually changed. */
export async function bulkUpdateProducts(
  rows: { id: string; name: string; brand: string; unit: string; stock: number; is_active: boolean }[]
): Promise<ImportResult> {
  if (rows.length === 0) return { ok: true, created: 0, updated: 0 };

  const supabase = await createClient();

  const results = await Promise.all(
    rows.map((r) =>
      supabase
        .from("products")
        .update({
          name: r.name,
          brand: r.brand,
          unit: r.unit,
          stock: r.stock,
          is_active: r.is_active,
        })
        .eq("id", r.id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  revalidatePath("/products");
  return { ok: true, created: 0, updated: rows.length };
}
