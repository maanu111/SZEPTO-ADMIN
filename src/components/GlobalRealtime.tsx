"use client";

import { useRealtime } from "@/lib/useRealtime";

/**
 * Sits in the dashboard layout and keeps the entire shell live.
 * Subscribing to orders here means the sidebar pending-count badge
 * updates the moment a new order arrives — no manual refresh needed.
 */
export function GlobalRealtime() {
  // Subscribe to every table that can change the layout (pending count, etc.)
  useRealtime(["orders", "order_items", "banners", "products", "categories", "store_settings", "pages"]);
  return null;
}
