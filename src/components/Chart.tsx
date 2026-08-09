"use client";

import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";

// Tree-shaken registration — only what the dashboard actually draws.
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

/** Shared dark palette so every chart matches the true-black shell. */
export const CHART_THEME = {
  textStyle: {
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    color: "#8a8a8a",
  },
  tooltip: {
    backgroundColor: "#141414",
    borderColor: "#1c1c1c",
    borderWidth: 1,
    padding: [8, 10] as [number, number],
    textStyle: { color: "#f2f2f2", fontSize: 12 },
  },
  axisLine: { lineStyle: { color: "#1c1c1c" } },
  splitLine: { lineStyle: { color: "#141414" } },
  axisLabel: { color: "#5e5e5e", fontSize: 10 },
};

type Props = {
  option: echarts.EChartsCoreOption;
  className?: string;
  /** Height in px; charts need an explicit box to size against. */
  height?: number;
};

export function Chart({ option, className = "", height = 260 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chartRef.current = chart;

    // ECharts can't observe its own container, so drive resize from the element.
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div ref={ref} style={{ height }} className={`w-full ${className}`} />;
}
