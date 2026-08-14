import type { StaffRow } from "@/lib/database.types";

/**
 * Every page the admin panel has, and the URL prefix that reaches it.
 *
 * This is the single list the sidebar renders from, the permission tick boxes
 * are built from, and route access is checked against — so a new page cannot
 * quietly ship without an access rule.
 */
export const ADMIN_PAGES = [
  { key: "dashboard", label: "Dashboard", path: "/", exact: true },
  { key: "orders", label: "Orders", path: "/orders" },
  { key: "products", label: "Products", path: "/products" },
  { key: "categories", label: "Categories", path: "/categories" },
  { key: "banners", label: "Banners", path: "/banners" },
  { key: "reports", label: "Reports", path: "/reports" },
  { key: "payment", label: "Payment", path: "/settings/payment" },
  { key: "shipping", label: "Delivery", path: "/settings/shipping" },
  { key: "pages", label: "Pages", path: "/pages" },
  { key: "staff", label: "Staff", path: "/staff" },
] as const;

export type PageKey = (typeof ADMIN_PAGES)[number]["key"];

export const ALL_PAGE_KEYS: PageKey[] = ADMIN_PAGES.map((p) => p.key);

/** What the app knows about whoever is signed in. */
export type Viewer = {
  id: string;
  email: string;
  fullName: string;
  role: StaffRow["role"];
  isOwner: boolean;
  allowedPages: PageKey[];
};

/**
 * The owner is not bound by the tick list.
 *
 * Storing an explicit list for the owner too would mean a mis-saved row could
 * lock the only person who can fix it out of the Staff page.
 */
export function canAccess(viewer: Viewer | null, page: PageKey): boolean {
  if (!viewer) return false;
  if (viewer.isOwner) return true;
  return viewer.allowedPages.includes(page);
}

/** Only the owner administers staff, so nobody can widen their own access. */
export function canManageStaff(viewer: Viewer | null): boolean {
  return Boolean(viewer?.isOwner);
}

/**
 * Which page a URL belongs to.
 *
 * Longest match wins so "/settings/payment" is not mistaken for a dashboard
 * route, and "/orders/abc" resolves to Orders.
 */
export function pageForPath(pathname: string): PageKey | null {
  if (pathname === "/") return "dashboard";

  let best: { key: PageKey; len: number } | null = null;
  for (const p of ADMIN_PAGES) {
    if (p.path === "/") continue;
    if (pathname === p.path || pathname.startsWith(`${p.path}/`)) {
      if (!best || p.path.length > best.len) best = { key: p.key, len: p.path.length };
    }
  }
  return best?.key ?? null;
}

/** The first page this viewer may open — where to send them after sign-in. */
export function landingPath(viewer: Viewer): string {
  if (viewer.isOwner) return "/";
  const first = ADMIN_PAGES.find((p) => viewer.allowedPages.includes(p.key));
  return first?.path ?? "/no-access";
}
