"use client";

import { useMemo } from "react";
import { CHART_THEME, Chart } from "@/components/Chart";
import { inr } from "@/components/ui";

type Point = { period: string; orders: number; revenue: number; items: number; shipping: number };

/** Reads "2026-08-11" or "2026-08" and formats it for the axis. */
function label(period: string, bucket: string): string {
  if (bucket === "month") {
    const [y, m] = period.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
  }
  return new Date(period).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function SalesChart({ data, bucket }: { data: Point[]; bucket: string }) {
  const points = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        orders: Number(d.orders),
        revenue: Number(d.revenue),
        items: Number(d.items),
        shipping: Number(d.shipping),
      })),
    [data]
  );

  const option = useMemo(
    () => ({
      textStyle: CHART_THEME.textStyle,
      grid: { top: 16, right: 8, bottom: 24, left: 8, containLabel: true },
      legend: {
        show: true,
        top: 0,
        right: 0,
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#6c6c76", fontSize: 10 },
      },
      tooltip: {
        trigger: "axis" as const,
        ...CHART_THEME.tooltip,
        axisPointer: { type: "shadow" as const, shadowStyle: { color: "rgba(20,20,30,0.04)" } },
        formatter: (params: unknown) => {
          const rows = params as { name: string; seriesName: string; value: number }[];
          if (!rows?.length) return "";
          const head = `<div style="font-weight:600;margin-bottom:3px">${rows[0].name}</div>`;
          const body = rows
            .map(
              (r) =>
                `<div>${r.seriesName}: ${
                  r.seriesName === "Orders" ? r.value : inr(r.value)
                }</div>`
            )
            .join("");
          return head + body;
        },
      },
      xAxis: {
        type: "category" as const,
        data: points.map((p) => label(p.period, bucket)),
        axisLine: CHART_THEME.axisLine,
        axisTick: { show: false },
        axisLabel: { ...CHART_THEME.axisLabel },
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
          name: "Goods",
          type: "bar" as const,
          stack: "revenue",
          data: points.map((p) => p.items),
          barMaxWidth: 26,
          itemStyle: { color: "#8425ab" },
        },
        {
          name: "Shipping",
          type: "bar" as const,
          stack: "revenue",
          data: points.map((p) => p.shipping),
          barMaxWidth: 26,
          itemStyle: { color: "#e5147e", borderRadius: [3, 3, 0, 0] },
        },
        {
          name: "Orders",
          type: "line" as const,
          yAxisIndex: 1,
          data: points.map((p) => p.orders),
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          lineStyle: { width: 1.5, color: "#b0b0b8" },
          itemStyle: { color: "#6c6c76" },
        },
      ],
    }),
    [points, bucket]
  );

  return <Chart option={option} height={260} />;
}
