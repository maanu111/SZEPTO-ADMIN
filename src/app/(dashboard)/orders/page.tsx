import Link from "next/link";
import { SearchIcon } from "@/components/icons";
import { ExportMenu } from "@/components/ExportMenu";
import { EmptyState, PageHeader, Panel, StatusBadge, inr, shortDate } from "@/components/ui";
import type { OrderStatus } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";

export const metadata = { title: "Orders" };
export const revalidate = 0;

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 30;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; range?: string; page?: string }>;
}) {
  const { status = "all", q = "", range = "all", page = "1" } = await searchParams;

  // Date window
  const RANGE_DAYS: Record<string, number | null> = {
    today: 0,
    "7d": 7,
    "30d": 30,
    all: null,
  };
  const days = RANGE_DAYS[range] ?? null;
  let fromTs: string | null = null;
  if (days !== null) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - days);
    fromTs = d.toISOString();
  }
  const pageNum = Math.max(1, Number(page) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id, code, customer_name, customer_phone, city, pincode, total, weight_kg, status, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (status !== "all") query = query.eq("status", status as OrderStatus);
  if (fromTs) query = query.gte("created_at", fromTs);

  const term = q.trim();
  if (term) {
    // Match on order code, customer name or phone.
    query = query.or(
      `code.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`
    );
  }

  const { data, count, error } = await query;
  const orders = data ?? [];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (patch: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (status !== "all") sp.set("status", status);
    if (term) sp.set("q", term);
    if (pageNum > 1) sp.set("page", String(pageNum));
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const s = sp.toString();
    return s ? `/orders?${s}` : "/orders";
  };

  return (
    <>
      <RealtimeRefresh tables={["orders"]} />
      <PageHeader
        title="Orders"
        subtitle={`${total} order${total === 1 ? "" : "s"}${status !== "all" ? ` · ${status}` : ""}`}
      />

      {/* Filters + search */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-shell-900 p-0.5">
          {FILTERS.map((f) => {
            const active = status === f.value;
            const sp = new URLSearchParams();
            if (f.value !== "all") sp.set("status", f.value);
            if (term) sp.set("q", term);
            const s = sp.toString();
            return (
              <Link
                key={f.value}
                href={s ? `/orders?${s}` : "/orders"}
                className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  active ? "bg-shell-800 text-text-hi" : "text-text-dim hover:text-text-hi"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        <form action="/orders" className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[14rem]">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          {range !== "all" && <input type="hidden" name="range" value={range} />}
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg bg-shell-850 px-2.5 focus-within:bg-shell-800">
            <SearchIcon className="h-3.5 w-3.5 shrink-0 text-text-faint" />
            <input
              name="q"
              defaultValue={term}
              placeholder="Code, name or phone"
              aria-label="Search orders"
              className="h-full w-full bg-transparent text-[12px] text-text-hi outline-none placeholder:text-text-faint"
            />
          </div>
        </form>

        {/* Date window */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-text-faint">When</span>
          <div className="flex items-center gap-0.5">
            {[
              { value: "all", label: "All" },
              { value: "today", label: "Today" },
              { value: "7d", label: "7d" },
              { value: "30d", label: "30d" },
            ].map((r) => {
              const on = range === r.value;
              return (
                <Link
                  key={r.value}
                  href={buildHref({ range: r.value === "all" ? "" : r.value, page: "" })}
                  aria-current={on ? "true" : undefined}
                  className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                    on ? "bg-shell-800 font-medium text-text-hi" : "text-text-dim hover:text-text-hi"
                  }`}
                >
                  {r.label}
                </Link>
              );
            })}
          </div>
        </div>

        <span className="ml-auto">
          <ExportMenu
            rows={orders.map((o) => ({
              code: o.code,
              placed: o.created_at,
              customer: o.customer_name,
              phone: o.customer_phone,
              city: o.city,
              pincode: o.pincode,
              weight_kg: o.weight_kg,
              total: o.total,
              status: o.status,
            }))}
            filename="szepto-orders"
            captureId="orders-capture"
          />
        </span>
      </div>

      <div id="orders-capture">
      <Panel padded={false}>
        {error ? (
          <EmptyState title="Couldn't load orders" hint={error.message} />
        ) : orders.length === 0 ? (
          <EmptyState
            title={term ? `No orders match "${term}"` : "No orders here"}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line-soft text-[11px] font-semibold uppercase tracking-wide text-text-faint">
                    <th className="px-4 py-2.5">Order</th>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5">Destination</th>
                    <th className="px-4 py-2.5 text-right">Weight</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="group relative cursor-pointer transition-colors hover:bg-shell-850"
                    >
                      <td className="px-4 py-3">
                        {/* after:inset-0 turns the whole row into the click target */}
                        <Link
                          href={`/orders/${o.id}`}
                          className="block after:absolute after:inset-0 after:content-['']"
                        >
                          <span className="block text-[13px] font-semibold text-text-hi">
                            {o.code}
                          </span>
                          <span className="block text-[11px] text-text-faint">
                            {shortDate(o.created_at)}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block text-[13px] text-text-hi">{o.customer_name}</span>
                        <span className="tnum block text-[11px] text-text-faint">
                          {o.customer_phone}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-text-dim">
                        {o.city} <span className="tnum text-text-faint">{o.pincode}</span>
                      </td>
                      <td className="tnum px-4 py-3 text-right text-[12px] text-text-dim">
                        {Number(o.weight_kg).toFixed(2)} kg
                      </td>
                      <td className="tnum px-4 py-3 text-right text-[13px] font-semibold text-text-hi">
                        {inr(o.total)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="divide-y divide-line-soft md:hidden">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="block px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-text-hi">{o.code}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="mt-1 text-[12px] text-text-dim">
                      {o.customer_name} · {o.city}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[11px] text-text-faint">{shortDate(o.created_at)}</span>
                      <span className="tnum text-[13px] font-semibold text-text-hi">
                        {inr(o.total)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[12px] text-text-faint">
            Page {pageNum} of {pages}
          </span>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link
                href={buildHref({ page: String(pageNum - 1) })}
                className="rounded-lg border border-line bg-shell-850 px-3 py-1.5 text-[12px] font-semibold text-text-hi hover:border-shell-700"
              >
                Previous
              </Link>
            )}
            {pageNum < pages && (
              <Link
                href={buildHref({ page: String(pageNum + 1) })}
                className="rounded-lg border border-line bg-shell-850 px-3 py-1.5 text-[12px] font-semibold text-text-hi hover:border-shell-700"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
