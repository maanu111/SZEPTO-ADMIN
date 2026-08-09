"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type PageInput = {
  slug: string;
  title: string;
  group_name: string;
  body: string;
  sort_order: number;
  is_active: boolean;
};

function validate(input: PageInput): string | null {
  if (input.title.trim().length < 2) return "Enter a title.";
  return null;
}

export async function savePage(id: string | null, input: PageInput): Promise<ActionResult> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("pages").update(input).eq("id", id)
    : await supabase.from("pages").insert(input);

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "That slug is already taken." : error.message,
    };
  }

  revalidatePath("/pages");
  return { ok: true };
}

