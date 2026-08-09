"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type BannerInput = {
  image_url: string | null;
  image_fit: "right" | "cover";
  cta_href: string;
  sort_order: number;
  is_active: boolean;
  /* kept in schema but no longer editable via this form */
  eyebrow: string;
  title: string;
  body: string;
  cta_label: string;
  color_from: string;
  color_to: string;
  product_slugs: string[];
};

function validate(input: BannerInput): string | null {
  if (!input.image_url) return "Upload a banner image first.";
  return null;
}

export async function saveBanner(
  id: string | null,
  input: BannerInput
): Promise<ActionResult> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("banners").update(input).eq("id", id)
    : await supabase.from("banners").insert({
        ...input,
        title: input.title || "Banner",
        cta_label: input.cta_label || "Shop now",
      });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/banners");
  return { ok: true };
}

export async function deleteBanner(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/banners");
  return { ok: true };
}

/** Updates sort_order for a list of banners in one round trip. */
export async function reorderBanners(
  ids: string[]
): Promise<ActionResult> {
  const supabase = await createClient();

  // Run all updates in parallel — one per banner
  const results = await Promise.all(
    ids.map((id, i) =>
      supabase.from("banners").update({ sort_order: i }).eq("id", id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  revalidatePath("/banners");
  return { ok: true };
}
