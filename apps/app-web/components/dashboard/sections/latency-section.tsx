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
import { LatencyMetricPoint } from "../context/dashboard-types";
import { Clock, ShieldCheck, TrendingDown } from "lucide-react";

interface LatencySectionProps {
  data: LatencyMetricPoint[];
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
    label: "P99 Tail Latency",
    color: "#93c5fd",
  },
} satisfies ChartConfig;

export function LatencySection({ data }: LatencySectionProps) {
  const avgP50 = React.useMemo(
    () => Math.round(data.reduce((acc, curr) => acc + curr.p50, 0) / (data.length || 1)),
    [data]
  );
  const avgP90 = React.useMemo(
    () => Math.round(data.reduce((acc, curr) => acc + curr.p90, 0) / (data.length || 1)),
    [data]
  );
  const maxP99 = React.useMemo(
    () => Math.max(...data.map((d) => d.p99)),
    [data]
  );

  return (
    <Card className="overflow-hidden border border-[#1e293b] bg-black shadow-xl">
      <div className="flex flex-col lg:flex-row">
        {/* Left Column: Metric Numbers & Stats */}
        <div className="flex w-full flex-col justify-between border-b border-[#1e293b] p-6 lg:w-80 lg:border-b-0 lg:border-r shrink-0">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#1e293b] bg-black text-blue-400">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Latency
                </span>
              </div>
            </div>

            {/* Big Primary Metric Number */}
            <div className="mt-4">
              <div className="text-4xl font-bold tracking-tight text-white font-mono">
                {avgP50} <span className="text-xl text-blue-400 font-sans font-medium">ms</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-blue-400">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>P50 execution time from ClickHouse</span>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Execution latency percentiles across distributed agent tool calls and LLM inference spans.
            </p>
          </div>

          {/* Breakdown Badges */}
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-[#1e293b] pt-4">
            <div className="rounded-md border border-[#1e293b] bg-black p-2 text-center">
              <div className="text-[10px] text-slate-400 font-medium">P50 (Med)</div>
              <div className="mt-1 font-mono text-xs font-bold text-[#60a5fa]">
                {avgP50} ms
              </div>
            </div>
            <div className="rounded-md border border-[#1e293b] bg-black p-2 text-center">
              <div className="text-[10px] text-slate-400 font-medium">P90</div>
              <div className="mt-1 font-mono text-xs font-bold text-[#3b82f6]">
                {avgP90} ms
              </div>
            </div>
            <div className="rounded-md border border-[#1e293b] bg-black p-2 text-center">
              <div className="text-[10px] text-slate-400 font-medium">P99 (Tail)</div>
              <div className="mt-1 font-mono text-xs font-bold text-[#93c5fd]">
                {maxP99} ms
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Latency Bar Graph */}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-center justify-between pb-3">
            <div className="text-xs font-medium text-slate-300">
              Percentile Distribution Over Time (Bar Graph)
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#60a5fa]" />
                <span className="text-slate-400">P50</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" />
                <span className="text-slate-400">P90</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#93c5fd]" />
                <span className="text-slate-400">P99</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[220px]">
            <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
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
                  stroke="#2563eb"
                  strokeDasharray="3 3"
                  label={{
                    value: "SLA Limit (300ms)",
                    fill: "#60a5fa",
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
                          <span className="text-slate-400">{name}:</span>
                          <span className="font-semibold text-blue-300 font-mono">{value} ms</span>
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
