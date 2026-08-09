"use client";

import { useRealtime, type RealtimeTable } from "@/lib/useRealtime";

/**
 * Drop into any Server Component page to keep it live.
 * Renders nothing — it only subscribes and triggers router.refresh() on changes.
 */
export function RealtimeRefresh({ tables }: { tables: RealtimeTable[] }) {
  useRealtime(tables);
  return null;
}
