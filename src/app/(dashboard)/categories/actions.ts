"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type CategoryInput = {
  slug: string;
  name: string;
  short_name: string;
  group_name: string;
  tint: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

function validate(input: CategoryInput): string | null {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(input.slug)) {
    return "Slug must be lowercase letters, numbers and hyphens.";
  }
  if (input.name.trim().length < 2) return "Enter a category name.";
  if (input.short_name.trim().length < 2) return "Enter a short name for the tile.";
  if (input.group_name.trim().length < 2) return "Enter a panel heading.";
  return null;
}

export async function saveCategory(
  id: string | null,
  input: CategoryInput
): Promise<ActionResult> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("categories").update(input).eq("id", id)
    : await supabase.from("categories").insert(input);

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "That slug is already taken." : error.message,
    };
  }

  revalidatePath("/categories");
  revalidatePath("/products");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Products reference categories with ON DELETE SET NULL — warn rather than orphan silently.
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `${count} product${count === 1 ? " is" : "s are"} still in this category. Move them first.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/categories");
  return { ok: true };
}
