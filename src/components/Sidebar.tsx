"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { PageKey } from "@/lib/access";
import { InstallButton } from "./InstallButton";
import {
  BoltIcon,
  BoxIcon,
  CloseIcon,
  DashIcon,
  DocIcon,
  GridIcon,
  LogoutIcon,
  MenuIcon,
  OrdersIcon,
  QrIcon,
  TruckIcon,
  ChartIcon,
  UsersIcon,
} from "./icons";

type Item = {
  href: string;
  label: string;
  icon: typeof DashIcon;
  exact?: boolean;
  /** Permission key from ADMIN_PAGES; the item is hidden without it. */
  page: PageKey;
};

/** A hairline separates groups instead of a shouted section heading. */
const GROUPS: Item[][] = [
  [{ href: "/", label: "Dashboard", icon: DashIcon, exact: true, page: "dashboard" }],
  [{ href: "/orders", label: "Orders", icon: OrdersIcon, page: "orders" }],
  [
    { href: "/products", label: "Products", icon: BoxIcon, page: "products" },
    { href: "/categories", label: "Categories", icon: GridIcon, page: "categories" },
    { href: "/banners", label: "Banners", icon: DocIcon, page: "banners" },
  ],
  [{ href: "/reports", label: "Reports", icon: ChartIcon, page: "reports" }],
  [
    { href: "/settings/payment", label: "Payment", icon: QrIcon, page: "payment" },
    { href: "/settings/shipping", label: "Shipping", icon: TruckIcon, page: "shipping" },
    { href: "/pages", label: "Pages", icon: DocIcon, page: "pages" },
  ],
  [{ href: "/staff", label: "Staff", icon: UsersIcon, page: "staff" }],
];

export function Sidebar({
  email,
  pendingCount,
  allowedPages,
  isOwner,
}: {
  email: string;
  pendingCount: number;
  allowedPages: PageKey[];
  isOwner: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Hide what this person cannot open. The pages are also guarded server-side,
  // so hiding them is tidiness rather than the security boundary.
  const groups = GROUPS.map((g) =>
    g.filter((item) => (item.page === "staff" ? isOwner : allowedPages.includes(item.page)))
  ).filter((g) => g.length > 0);

  const isActive = (item: Item) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const nav = (
    <nav className="thin-scrollbar flex-1 overflow-y-auto px-2 py-2">
      {groups.map((group, i) => (
        <ul
          key={group[0].href}
          className={`flex flex-col gap-px ${i > 0 ? "mt-2 border-t border-line-soft pt-2" : ""}`}
        >
          {group.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] transition-colors ${
                    active
                      ? "bg-shell-850 font-medium text-text-hi"
                      : "text-text-dim hover:text-text-hi"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.href === "/orders" && pendingCount > 0 && (
                    <span className="tnum shrink-0 text-[10px] font-semibold text-warn-400">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-line-soft">
      <div className="px-2 pt-2">
        <InstallButton />
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5">
      <span className="min-w-0 flex-1 truncate text-[11px] text-text-dim">{email}</span>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            aria-label="Sign out"
            className="flex h-6 w-6 items-center justify-center rounded text-text-faint transition-colors hover:text-bad-400"
          >
            <LogoutIcon className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );

  const brand = (
    <div className="flex h-12 shrink-0 items-center gap-2 px-3.5">
      <BoltIcon className="h-3.5 w-3.5 text-accent-500" />
      <span className="text-[13px] font-semibold tracking-tight text-text-hi">SZepto</span>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="fixed left-3 top-2.5 z-40 flex h-8 w-8 items-center justify-center rounded-md bg-shell-850 text-text-hi lg:hidden"
      >
        <MenuIcon className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-56 flex-col border-r border-line bg-shell-900">
            <div className="flex items-center justify-between pr-2">
              <div className="flex-1">{brand}</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex h-7 w-7 items-center justify-center rounded text-text-dim hover:text-text-hi"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <aside className="fixed inset-y-0 left-0 hidden w-52 flex-col border-r border-line bg-shell-950 lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>
    </>
  );
}
