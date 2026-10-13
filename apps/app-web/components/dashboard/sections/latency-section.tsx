"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LatencyMetricPoint, MetricSummary } from "../context/dashboard-types";
import { Clock, TrendingDown } from "lucide-react";

interface LatencySectionProps {
  data: LatencyMetricPoint[];
  summary?: MetricSummary | null;
}

const chartConfig = {
  p50: {
    label: "P50 Median",
    color: "#60a5fa",
  },
  p90: {
    label: "P90 Percentile",
    color: "#3b82f6",
  },
  p99: {
    label: "P99 Tail Response Time",
    color: "#93c5fd",
  },
} satisfies ChartConfig;

export function LatencySection({ data, summary }: LatencySectionProps) {
  const avgP50 = React.useMemo(
    () => Math.round(data.reduce((acc, curr) => acc + curr.p50, 0) / (data.length || 1)),
    [data]
  );
  const avgP90 = React.useMemo(
    () => Math.round(data.reduce((acc, curr) => acc + curr.p90, 0) / (data.length || 1)),
    [data]
  );
  const maxP99 = React.useMemo(
    () => (data.length > 0 ? Math.max(...data.map((d) => d.p99)) : 0),
    [data]
  );

  return (
    <Card className="overflow-hidden rounded-xl border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-xl">
      <div className="flex flex-col lg:flex-row">
        {/* Left Column: Metric Numbers & Stats */}
        <div className="flex w-full flex-col justify-between border-b border-slate-200 dark:border-[#1e293b] p-6 lg:w-80 lg:border-b-0 lg:border-r bg-slate-50/70 dark:bg-black shrink-0">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-[#1e293b] bg-white dark:bg-black text-blue-600 dark:text-blue-400 shadow-xs">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Response Time
                </span>
              </div>
            </div>

            {/* Big Primary Metric Number */}
            <div className="mt-4">
              <div className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
                {avgP50} <span className="text-xl text-blue-600 dark:text-blue-400 font-sans font-medium">ms</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-mono">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>
                  P50 Median {summary?.avg_response_time_ms != null ? `· Fleet Mean: ${Math.round(summary.avg_response_time_ms)}ms` : ""}
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Execution response time percentiles across distributed agent tool calls and LLM inference spans.
            </p>
          </div>

          {/* Breakdown Badges */}
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-slate-200 dark:border-[#1e293b] pt-4">
            <div className="rounded-lg border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black p-2.5 text-center shadow-xs">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">P50 (Med)</div>
              <div className="mt-1 font-mono text-xs font-bold text-blue-600 dark:text-[#60a5fa]">
                {avgP50} ms
              </div>
            </div>
            <div className="rounded-lg border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black p-2.5 text-center shadow-xs">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">P90</div>
              <div className="mt-1 font-mono text-xs font-bold text-blue-700 dark:text-[#3b82f6]">
                {avgP90} ms
              </div>
            </div>
            <div className="rounded-lg border border-slate-200/90 dark:border-[#1e293b] bg-white dark:bg-black p-2.5 text-center shadow-xs">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">P99 (Tail)</div>
              <div className="mt-1 font-mono text-xs font-bold text-indigo-600 dark:text-[#93c5fd]">
                {maxP99} ms
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Latency Bar Graph */}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-center justify-between pb-3">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Percentile Distribution Over Time (Bar Graph)
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#60a5fa]" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">P50</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">P90</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#93c5fd]" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">P99</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[220px]">
            <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}ms`}
                />
                <ReferenceLine
                  y={300}
                  stroke="#3b82f6"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "SLA Limit (300ms)",
                    fill: "#2563eb",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
                <ChartTooltip
                  cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-3 text-xs">
                          <span className="text-slate-500 dark:text-slate-400">{name}:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-300 font-mono">{value} ms</span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="p50" fill="#60a5fa" radius={[2, 2, 0, 0]} />
                <Bar dataKey="p90" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="p99" fill="#93c5fd" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}
