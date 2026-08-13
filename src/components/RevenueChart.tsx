"use client";

import { useMemo } from "react";
import { CHART_THEME, Chart } from "./Chart";
import { inr } from "./ui";

type Point = { day: string; orders: number; revenue: number };

/** Revenue + order count over the last 14 days. */
export function RevenueChart({ data }: { data: Point[] }) {
  const days = useMemo(() => {
    // Fill gaps so the axis stays continuous through quiet days.
    const out: Point[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const hit = data.find((p) => p.day === key);
      out.push({ day: key, orders: Number(hit?.orders ?? 0), revenue: Number(hit?.revenue ?? 0) });
    }
    return out;
  }, [data]);

  const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = days.reduce((s, d) => s + d.orders, 0);

  const option = useMemo(
    () => ({
      textStyle: CHART_THEME.textStyle,
      grid: { top: 16, right: 8, bottom: 24, left: 8, containLabel: true },
      tooltip: {
        trigger: "axis" as const,
        ...CHART_THEME.tooltip,
        axisPointer: { type: "shadow" as const, shadowStyle: { color: "rgba(20,20,30,0.04)" } },
        formatter: (params: unknown) => {
          const rows = params as { name: string; seriesName: string; value: number }[];
          if (!rows?.length) return "";
          const label = new Date(rows[0].name).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          });
          const revenue = rows.find((r) => r.seriesName === "Revenue")?.value ?? 0;
          const orders = rows.find((r) => r.seriesName === "Orders")?.value ?? 0;
          return `<div style="font-weight:600;margin-bottom:2px">${label}</div>
            <div>${inr(revenue)}</div>
            <div style="color:#6c6c76">${orders} order${orders === 1 ? "" : "s"}</div>`;
        },
      },
      xAxis: {
        type: "category" as const,
        data: days.map((d) => d.day),
        axisLine: CHART_THEME.axisLine,
        axisTick: { show: false },
        axisLabel: {
          ...CHART_THEME.axisLabel,
          formatter: (value: string) =>
            new Date(value).toLocaleDateString("en-IN", { day: "numeric" }),
        },
      },
      yAxis: [
        {
          type: "value" as const,
          splitLine: CHART_THEME.splitLine,
          axisLabel: {
            ...CHART_THEME.axisLabel,
            formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)),
          },
        },
        { type: "value" as const, show: false },
      ],
      series: [
        {
          name: "Revenue",
          type: "bar" as const,
          data: days.map((d) => d.revenue),
          barMaxWidth: 22,
          itemStyle: {
            borderRadius: [3, 3, 0, 0],
            color: {
              type: "linear" as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#e5147e" },
                { offset: 1, color: "#6d1b8c" },
              ],
            },
          },
        },
        {
          name: "Orders",
          type: "line" as const,
          yAxisIndex: 1,
          data: days.map((d) => d.orders),
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          lineStyle: { width: 1.5, color: "#b0b0b8" },
          itemStyle: { color: "#9b9ba4" },
        },
      ],
    }),
    [days]
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span>
          <span className="tnum block text-xl font-semibold text-text-hi">
            {inr(totalRevenue)}
          </span>
          <span className="block text-[11px] text-text-faint">Last 14 days</span>
        </span>
        <span>
          <span className="tnum block text-xl font-semibold text-text-hi">{totalOrders}</span>
          <span className="block text-[11px] text-text-faint">Orders</span>
        </span>
      </div>

      <Chart option={option} height={240} />
    </div>
  );
}
