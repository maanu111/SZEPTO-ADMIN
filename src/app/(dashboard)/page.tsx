import Link from "next/link";
import { ExportMenu } from "@/components/ExportMenu";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { RevenueChart } from "@/components/RevenueChart";
import { AlertIcon, BoxIcon, ChevronRight, OrdersIcon, RupeeIcon } from "@/components/icons";
import { EmptyState, PageHeader, Panel, StatusBadge, inr, shortDate } from "@/components/ui";
import type { DashboardStats } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };
export const revalidate = 0;

/** Windows the dashboard can be scoped to. `days: null` means all time. */
const RANGES = [
  { key: "today", label: "Today", days: 0 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "year", label: "1 year", days: 365 },
  { key: "all", label: "All", days: null },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

const EMPTY: DashboardStats = {
  orders_total: 0,
  orders_pending: 0,
  orders_confirmed: 0,
  orders_shipped: 0,
  orders_delivered: 0,
  orders_cancelled: 0,
  revenue_total: 0,
  revenue_pending: 0,
  orders_today: 0,
  revenue_today: 0,
  products_total: 0,
  products_inactive: 0,
  out_of_stock: 0,
  categories_total: 0,
  avg_order_value: 0,
  total_weight_kg: 0,
  top_products: [],
  daily: [],
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range = "30d" } = await searchParams;
  const active: RangeKey = RANGES.some((r) => r.key === range) ? (range as RangeKey) : "30d";
  const days = RANGES.find((r) => r.key === active)!.days;

  let fromTs: string | null = null;
  if (days !== null) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - days);
    fromTs = d.toISOString();
  }

  const supabase = await createClient();
  const [{ data: statsData }, { data: recent }, { data: settings }] = await Promise.all([
    supabase.rpc("admin_dashboard_stats", { from_ts: fromTs, to_ts: null }),
    supabase
      .from("orders")
      .select("id, code, customer_name, city, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("store_settings").select("qr_url, rate_per_kg, service_charge").maybeSingle(),
  ]);

  const stats: DashboardStats = { ...EMPTY, ...(statsData as DashboardStats | null) };
  const orders = recent ?? [];

  const exportRows = stats.daily.map((d) => ({
    date: d.day,
    orders: d.orders,
    revenue: d.revenue,
  }));

  return (
    <>
      <RealtimeRefresh tables={["orders", "order_items", "products", "store_settings"]} />

      <PageHeader
        title="Dashboard"
        action={
          <ExportMenu
            rows={exportRows}
            filename={`szepto-dashboard-${active}`}
            captureId="dashboard-capture"
          />
        }
      />

      {/* Range filter — always visible, nothing to open */}
      <nav className="mb-3 flex flex-wrap items-center gap-1">
        {RANGES.map((r) => {
          const on = r.key === active;
          return (
            <Link
              key={r.key}
              href={r.key === "30d" ? "/" : `/?range=${r.key}`}
              aria-current={on ? "true" : undefined}
              className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                on ? "bg-shell-800 font-medium text-text-hi" : "text-text-dim hover:text-text-hi"
              }`}
            >
              {r.label}
            </Link>
          );
        })}
      </nav>

      <div id="dashboard-capture">
        {settings && !settings.qr_url && (
          <Link
            href="/settings/payment"
            className="mb-3 flex items-center gap-3 rounded-xl bg-warn-500/10 px-4 py-2.5 transition-colors hover:bg-warn-500/15"
          >
            <AlertIcon className="h-4 w-4 shrink-0 text-warn-400" />
            <span className="flex-1 text-[12px] font-medium text-warn-400">
              No payment QR — checkout is blocked
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-warn-400" />
          </Link>
        )}

        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label="Revenue"
            value={inr(stats.revenue_total)}
            hint={`${inr(stats.revenue_pending)} pending`}
            icon={<RupeeIcon className="h-3.5 w-3.5" />}
            tone="ok"
          />
          <Kpi
            label="Orders"
            value={String(stats.orders_total)}
            hint={`avg ${inr(stats.avg_order_value)}`}
            icon={<OrdersIcon className="h-3.5 w-3.5" />}
            href="/orders"
          />
          <Kpi
            label="To verify"
            value={String(stats.orders_pending)}
            hint={stats.orders_pending > 0 ? "Needs review" : "All caught up"}
            icon={<AlertIcon className="h-3.5 w-3.5" />}
            tone={stats.orders_pending > 0 ? "warn" : "neutral"}
            href="/orders?status=pending"
          />
          <Kpi
            label="Products"
            value={String(stats.products_total)}
            hint={
              stats.out_of_stock > 0
                ? `${stats.out_of_stock} out of stock`
                : `${stats.categories_total} categories`
            }
            icon={<BoxIcon className="h-3.5 w-3.5" />}
            tone={stats.out_of_stock > 0 ? "bad" : "neutral"}
            href="/products"
          />
        </div>

        {/* Where every order currently sits, one click from the filtered list. */}
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { label: "Pending", value: stats.orders_pending, status: "pending", tone: "text-warn-400" },
            { label: "Confirmed", value: stats.orders_confirmed, status: "confirmed", tone: "text-ok-400" },
            { label: "Shipped", value: stats.orders_shipped, status: "shipped", tone: "text-accent-400" },
            { label: "Delivered", value: stats.orders_delivered, status: "delivered", tone: "text-ok-400" },
            { label: "Cancelled", value: stats.orders_cancelled, status: "cancelled", tone: "text-bad-400" },
          ].map((s) => (
            <Link
              key={s.status}
              href={`/orders?status=${s.status}`}
              className="flex items-center justify-between rounded-lg border border-line-soft px-3 py-2 transition-colors hover:border-line"
            >
              <span className="truncate text-[11px] font-medium text-fg-dim">{s.label}</span>
              <span className={`text-[13px] font-semibold tabular-nums ${s.value > 0 ? s.tone : "text-fg-dim"}`}>
                {s.value}
              </span>
            </Link>
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Panel title="Revenue">
            <RevenueChart data={stats.daily} />
          </Panel>

          <div className="flex flex-col gap-3">
            <Panel
              title="Recent orders"
              action={
                <Link
                  href="/orders"
                  className="text-[11px] font-medium text-accent-400 hover:text-accent-500"
                >
                  See all
                </Link>
              }
              padded={false}
            >
              {orders.length === 0 ? (
                <EmptyState title="No orders yet" />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {orders.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/orders/${o.id}`}
                        className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-shell-850"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[12px] font-medium text-text-hi">
                              {o.customer_name}
                            </span>
                            <StatusBadge status={o.status} />
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-text-faint">
                            {o.code} · {o.city} · {shortDate(o.created_at)}
                          </span>
                        </span>
                        <span className="tnum shrink-0 text-[12px] font-medium text-text-hi">
                          {inr(o.total)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {stats.top_products.length > 0 && (
              <Panel title="Best sellers" padded={false}>
                <ul className="divide-y divide-line-soft">
                  {stats.top_products.map((p) => (
                    <li key={p.name} className="flex items-center gap-3 px-4 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-[12px] text-text-hi">
                        {p.name}
                      </span>
                      <span className="tnum shrink-0 text-[11px] text-text-faint">×{p.qty}</span>
                      <span className="tnum shrink-0 text-[12px] text-text-hi">
                        {inr(p.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>

        {settings && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <MiniStat
              label="Shipping rate"
              value={`${inr(settings.rate_per_kg)} / kg`}
              href="/settings/shipping"
            />
            <MiniStat
              label="Service charge"
              value={inr(settings.service_charge)}
              href="/settings/shipping"
            />
            <MiniStat label="Shipped weight" value={`${stats.total_weight_kg} kg`} href="/orders" />
          </div>
        )}
      </div>
    </>
  );
}

const TONES = {
  neutral: "text-text-faint",
  ok: "text-ok-400",
  warn: "text-warn-400",
  bad: "text-bad-400",
} as const;

function Kpi({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: keyof typeof TONES;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] text-text-dim">{label}</span>
        <span className={TONES[tone]}>{icon}</span>
      </div>
      <p className="tnum mt-1.5 text-xl font-semibold tracking-tight text-text-hi">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-text-faint">{hint}</p>}
    </>
  );

  const className = "rounded-xl border border-line bg-shell-900 p-3.5 transition-colors";

  return href ? (
    <Link href={href} className={`${className} hover:border-shell-700`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function MiniStat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-shell-900 px-3.5 py-2.5 transition-colors hover:border-shell-700"
    >
      <span className="text-[11px] text-text-dim">{label}</span>
      <span className="tnum text-[12px] font-medium text-text-hi">{value}</span>
    </Link>
  );
}
