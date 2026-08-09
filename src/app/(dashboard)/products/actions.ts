"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type VariantInput = {
  id?: string;
  label: string;
  unit: string;
  price: number;
  mrp: number;
  weight_kg: number;
  in_stock: boolean;
  is_default: boolean;
};

export type ProductInput = {
  slug: string;
  name: string;
  brand: string;
  category_id: string | null;
  description: string;
  unit: string;
  stock: number;
  rating: number;
  image_url: string | null;
  tags: string[];
  shipping_info: string | null;
  return_policy: string | null;
  is_active: boolean;
};

function validate(input: ProductInput, variants: VariantInput[]): string | null {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(input.slug)) {
    return "Slug must be lowercase letters, numbers and hyphens.";
  }
  if (input.name.trim().length < 2) return "Enter a product name.";
  if (variants.length === 0) return "Add at least one pack.";
  if (variants.some((v) => !v.label.trim() || !v.unit.trim())) {
    return "Every pack needs a label and a unit.";
  }
  if (variants.some((v) => v.price < 0 || v.mrp < 0)) return "Prices can't be negative.";
  if (variants.some((v) => v.weight_kg <= 0)) {
    return "Every pack needs a weight above zero — shipping is billed on it.";
  }
  return null;
}

/** Variants are replaced wholesale: simpler and safer than diffing rows. */
async function replaceVariants(productId: string, variants: VariantInput[]) {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("product_variants")
    .delete()
    .eq("product_id", productId);
  if (deleteError) return deleteError.message;

  // Exactly one default, always.
  const defaultIndex = Math.max(0, variants.findIndex((v) => v.is_default));

  const { error: insertError } = await supabase.from("product_variants").insert(
    variants.map((v, i) => ({
      product_id: productId,
      label: v.label.trim(),
      unit: v.unit.trim(),
      price: Math.round(v.price),
      mrp: Math.round(Math.max(v.mrp, v.price)),
      weight_kg: v.weight_kg,
      in_stock: v.in_stock,
      is_default: i === defaultIndex,
      sort_order: i,
    }))
  );
  return insertError?.message ?? null;
}

export async function createProduct(
  input: ProductInput,
  variants: VariantInput[]
): Promise<ActionResult<{ id: string }>> {
  const invalid = validate(input, variants);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ ...input, images: input.image_url ? [input.image_url] : [] })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "That slug is already taken." : error.message,
    };
  }

  const variantError = await replaceVariants(data.id, variants);
  if (variantError) return { ok: false, error: variantError };

  revalidatePath("/products");
  return { ok: true, data: { id: data.id } };
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  variants: VariantInput[]
): Promise<ActionResult> {
  const invalid = validate(input, variants);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ ...input, images: input.image_url ? [input.image_url] : [] })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "That slug is already taken." : error.message,
    };
  }

  const variantError = await replaceVariants(id, variants);
  if (variantError) return { ok: false, error: variantError };

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/products");
  return { ok: true };
}
