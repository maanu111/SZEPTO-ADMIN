import Link from "next/link";
import { ExportMenu } from "@/components/ExportMenu";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { EmptyState, PageHeader, Panel, Pill, inr } from "@/components/ui";
import type { ProductReport, SalesReport } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { SalesChart } from "./SalesChart";
import { requirePage } from "@/lib/viewer";

export const metadata = { title: "Reports" };
export const revalidate = 0;

const RANGES = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "year", label: "1 year", days: 365 },
  { key: "all", label: "All", days: null },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

const TABS = [
  { key: "sales", label: "Sales" },
  { key: "products", label: "Products" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; tab?: string; from?: string; to?: string }>;
}) {
  await requirePage("reports");
  const { range = "30d", tab = "sales", from = "", to = "" } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "sales";
  const activeRange: RangeKey = RANGES.some((r) => r.key === range) ? (range as RangeKey) : "30d";

  // An explicit from/to always wins over the quick range buttons.
  let fromTs: string | null = null;
  let toTs: string | null = null;
  const custom = Boolean(from && to);

  if (custom) {
    fromTs = new Date(`${from}T00:00:00`).toISOString();
    toTs = new Date(`${to}T23:59:59`).toISOString();
  } else {
    const days = RANGES.find((r) => r.key === activeRange)!.days;
    if (days !== null) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - days);
      fromTs = d.toISOString();
    }
  }

  // Buckets by month once the window is long enough for daily points to be noise.
  const bucket = activeRange === "year" || activeRange === "all" || spansMonths(fromTs, toTs)
    ? "month"
    : "day";

  const supabase = await createClient();
  const [{ data: salesData }, { data: productData }] = await Promise.all([
    supabase.rpc("admin_sales_report", { from_ts: fromTs, to_ts: toTs, bucket }),
    supabase.rpc("admin_product_report", { from_ts: fromTs, to_ts: toTs }),
  ]);

  const sales = (salesData ?? null) as SalesReport | null;
  const products = (productData ?? null) as ProductReport | null;

  const href = (patch: Record<string, string>) => {
    const sp = new URLSearchParams();
    sp.set("tab", activeTab);
    if (!custom) sp.set("range", activeRange);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    return `/reports?${sp}`;
  };

  const windowLabel = custom
    ? `${from} to ${to}`
    : RANGES.find((r) => r.key === activeRange)!.label.toLowerCase();

  return (
    <>
      <RealtimeRefresh tables={["orders", "order_items", "products"]} />

      <PageHeader title="Reports" subtitle={`Last ${windowLabel}`} />

      {/* Tabs */}
      <nav className="mb-3 flex gap-5 border-b border-line-soft">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href({ tab: t.key })}
            aria-current={t.key === activeTab ? "page" : undefined}
            className={`-mb-px border-b pb-2 text-[12px] transition-colors ${
              t.key === activeTab
                ? "border-text-hi font-medium text-text-hi"
                : "border-transparent text-text-dim hover:text-text-hi"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Date filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-shell-900 p-0.5">
          {RANGES.map((r) => {
            const on = !custom && r.key === activeRange;
            return (
              <Link
                key={r.key}
                href={`/reports?tab=${activeTab}&range=${r.key}`}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  on ? "bg-shell-800 text-text-hi" : "text-text-dim hover:text-text-hi"
                }`}
              >
                {r.label}
              </Link>
            );
          })}
        </div>

        <form action="/reports" className="flex items-center gap-1.5">
          <input type="hidden" name="tab" value={activeTab} />
          <input
            type="date"
            name="from"
            defaultValue={from}
            aria-label="From date"
            className="field h-8 w-auto text-[11px]"
          />
          <span className="text-[11px] text-text-faint">to</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            aria-label="To date"
            className="field h-8 w-auto text-[11px]"
          />
          <button
            type="submit"
            className="h-8 rounded-lg bg-shell-850 px-3 text-[11px] font-semibold text-text-hi transition-colors hover:bg-shell-800"
          >
            Apply
          </button>
          {custom && (
            <Link
              href={`/reports?tab=${activeTab}&range=30d`}
              className="h-8 px-2 text-[11px] leading-8 text-text-dim hover:text-text-hi"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {activeTab === "sales" ? (
        <SalesTab sales={sales} bucket={bucket} />
      ) : (
        <ProductsTab report={products} />
      )}
    </>
  );
}

function spansMonths(fromTs: string | null, toTs: string | null): boolean {
  if (!fromTs) return true;
  const start = new Date(fromTs).getTime();
  const end = toTs ? new Date(toTs).getTime() : Date.now();
  return end - start > 1000 * 60 * 60 * 24 * 120;
}

/* ------------------------------------------------------------------ sales */

function SalesTab({ sales, bucket }: { sales: SalesReport | null; bucket: string }) {
  if (!sales || sales.orders_total === 0) {
    return (
      <Panel>
        <EmptyState title="No sales in this period" hint="Try a wider date range." />
      </Panel>
    );
  }

  const rows = [
    { label: "Gross sales", value: inr(sales.gross_sales), hint: "Paid orders only" },
    { label: "Goods", value: inr(sales.item_sales) },
    { label: "Shipping collected", value: inr(sales.shipping_sales) },
    { label: "Service charges", value: inr(sales.service_sales) },
    { label: "Discounts given", value: inr(sales.discounts) },
  ];

  const kpis = [
    { label: "Paid orders", value: String(sales.orders_paid) },
    { label: "Units sold", value: String(sales.units_total) },
    { label: "Avg order", value: inr(sales.avg_order_value) },
    { label: "Total weight", value: `${sales.weight_total} kg` },
    { label: "Cancelled", value: String(sales.orders_cancelled) },
  ];

  const exportRows = sales.series.map((s) => ({
    period: s.period,
    orders: s.orders,
    revenue: s.revenue,
    goods: s.items,
    shipping: s.shipping,
  }));

  return (
    <div id="report-capture" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-line bg-shell-900 px-3 py-2.5">
            <p className="truncate text-[11px] text-text-dim">{k.label}</p>
            <p className="tnum mt-0.5 text-[15px] font-semibold text-text-hi">{k.value}</p>
          </div>
        ))}
      </div>

      <Panel
        title={`Revenue by ${bucket}`}
        action={
          <ExportMenu
            rows={exportRows}
            filename="sales-report"
            captureId="report-capture"
            label="Export"
          />
        }
      >
        <SalesChart data={sales.series} bucket={bucket} />
      </Panel>

      <Panel title="Breakdown">
        <ul className="flex flex-col divide-y divide-line-soft">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-[12px] text-text-dim">
                {r.label}
                {r.hint && <span className="ml-1.5 text-[10px] text-text-faint">{r.hint}</span>}
              </span>
              <span className="tnum text-[13px] font-semibold text-text-hi">{r.value}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* --------------------------------------------------------------- products */

function ProductsTab({ report }: { report: ProductReport | null }) {
  if (!report) {
    return (
      <Panel>
        <EmptyState title="No product data" hint="Try a wider date range." />
      </Panel>
    );
  }

  const kpis = [
    { label: "Products sold", value: String(report.products_sold) },
    { label: "Never sold", value: String(report.never_sold) },
    { label: "Units", value: String(report.units_total) },
    { label: "Revenue", value: inr(report.revenue_total) },
  ];

  return (
    <div id="report-capture" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-line bg-shell-900 px-3 py-2.5">
            <p className="truncate text-[11px] text-text-dim">{k.label}</p>
            <p className="tnum mt-0.5 text-[15px] font-semibold text-text-hi">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <RankTable
          title="Top 10 sellers"
          rows={report.top}
          tone="ok"
          empty="Nothing sold in this period."
        />
        <RankTable
          title="Least 10 sellers"
          rows={report.least}
          tone="bad"
          empty="No products to rank."
        />
      </div>

      <Panel
        title="Every product"
        action={
          <ExportMenu
            rows={report.all.map((r) => ({
              product: r.name,
              category: r.category ?? "",
              units_sold: r.units_sold,
              revenue: r.revenue,
              stock: r.stock,
              status: r.is_active ? "Live" : "Hidden",
            }))}
            filename="product-report"
            captureId="report-capture"
            label="Export"
          />
        }
        padded={false}
      >
        <div className="thin-scrollbar max-h-[32rem] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-shell-900">
              <tr className="border-b border-line-soft text-left">
                <Th>Product</Th>
                <Th className="hidden sm:table-cell">Category</Th>
                <Th className="text-right">Units</Th>
                <Th className="text-right">Revenue</Th>
                <Th className="hidden text-right sm:table-cell">Stock</Th>
              </tr>
            </thead>
            <tbody>
              {report.all.map((r) => (
                <tr key={r.slug} className="border-b border-line-soft last:border-0">
                  <td className="max-w-0 px-3 py-2">
                    <p className="truncate text-[12px] text-text-hi">{r.name}</p>
                  </td>
                  <td className="hidden px-3 py-2 text-[11px] text-text-dim sm:table-cell">
                    {r.category || "—"}
                  </td>
                  <td className="tnum px-3 py-2 text-right text-[12px] text-text-hi">
                    {r.units_sold}
                  </td>
                  <td className="tnum px-3 py-2 text-right text-[12px] text-text">
                    {inr(r.revenue)}
                  </td>
                  <td
                    className={`tnum hidden px-3 py-2 text-right text-[12px] sm:table-cell ${
                      r.stock <= 0 ? "text-bad-400" : "text-text-dim"
                    }`}
                  >
                    {r.stock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function RankTable({
  title,
  rows,
  tone,
  empty,
}: {
  title: string;
  rows: ProductReport["top"];
  tone: "ok" | "bad";
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <Panel title={title}>
        <p className="py-6 text-center text-[12px] text-text-dim">{empty}</p>
      </Panel>
    );
  }

  return (
    <Panel title={title} padded={false}>
      <ol className="flex flex-col">
        {rows.map((r, i) => (
          <li
            key={r.slug}
            className="flex items-center gap-3 border-b border-line-soft px-3 py-2 last:border-0"
          >
            <span className="tnum w-4 shrink-0 text-[11px] text-text-faint">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] text-text-hi">{r.name}</span>
              <span className="block truncate text-[10px] text-text-faint">
                {r.category || "—"}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <Pill tone={r.units_sold > 0 ? tone : "neutral"}>{r.units_sold} sold</Pill>
              <span className="tnum mt-0.5 block text-[10px] text-text-dim">{inr(r.revenue)}</span>
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2 text-[10px] font-medium text-text-faint ${className}`}>{children}</th>
  );
}
