import { redirect } from "next/navigation";
import { cache } from "react";
import type { PageKey, Viewer } from "@/lib/access";
import { ALL_PAGE_KEYS, canAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

/**
 * Who is signed in, and what they may open.
 *
 * Cached per request so the layout and each page guard share one round trip.
 *
 * The legacy `profiles.is_admin` flag still grants owner rights. That is what
 * the original single-admin login used, and dropping it would lock the owner
 * out of the very page they need to fix their own staff row.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: staff }] = await Promise.all([
    supabase.from("profiles").select("is_admin, email").eq("id", user.id).maybeSingle(),
    supabase
      .from("staff")
      .select("id, email, full_name, role, is_active, allowed_pages, auth_user_id")
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
      .maybeSingle(),
  ]);

  const isOwner = Boolean(profile?.is_admin) || staff?.role === "owner";

  // A staff member who has been switched off keeps their password but loses
  // every page, so the session resolves to no access rather than an error.
  if (!isOwner && (!staff || !staff.is_active)) return null;

  return {
    id: user.id,
    email: staff?.email ?? profile?.email ?? user.email ?? "",
    fullName: staff?.full_name || (isOwner ? "Owner" : ""),
    role: isOwner ? "owner" : (staff?.role ?? "staff"),
    isOwner,
    allowedPages: isOwner ? ALL_PAGE_KEYS : ((staff?.allowed_pages ?? []) as PageKey[]),
  };
});

/**
 * Guard for a page's Server Component.
 *
 * Called at the top of every dashboard page so a staff member cannot reach a
 * page by typing its URL. Returns the viewer so the page can also branch on
 * ownership without a second lookup.
 */
export async function requirePage(page: PageKey): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!canAccess(viewer, page)) redirect("/no-access");
  return viewer;
}
